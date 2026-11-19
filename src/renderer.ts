import {WOOWL_CHAPTERS} from './config/chapters';
import {WOOWL_MONSTERS} from './config/curves';
import {WOOWL_SKILLS} from './config/skills';
import Phaser from 'phaser';
import { game, calcDirection, WORLD_WIDTH, WORLD_HEIGHT } from './game';
import type { EffectEvent, MonsterEntity, MinionEntity, DropEntity, DamageNumber } from './types';
import { assetUrl } from './utils';

// Map 0-7 direction to 5-direction digit + flipX
export function getDirInfo(dir: number): { dirDigit: number; flipX: boolean } {
  const d = ((dir % 8) + 8) % 8;
  if (d <= 4) {
    return { dirDigit: d, flipX: false };
  } else if (d === 5) {
    return { dirDigit: 3, flipX: true };
  } else if (d === 6) {
    return { dirDigit: 2, flipX: true };
  } else {
    return { dirDigit: 1, flipX: true };
  }
}

const HERO_ATLAS_MAP: Record<string, string> = {
  warrior: 'hero_5110501',
  wizard: 'hero_5120503',
  taoist: 'hero_5130503'
};

export class BattleScene extends Phaser.Scene {
  // Entities
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Graphics;
  private playerShieldSprite!: Phaser.GameObjects.Sprite;

  private monsterSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private monsterPool: Phaser.GameObjects.Sprite[] = [];

  private minionSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private minionPool: Phaser.GameObjects.Sprite[] = [];

  private dropSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private dropPool: Phaser.GameObjects.Sprite[] = [];

  private fxGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private screenUiGfx!: Phaser.GameObjects.Graphics;
  private joystickGfx!: Phaser.GameObjects.Graphics;


  // Floating Touch Joystick
  private touchOrigin: { x: number; y: number } | null = null;
  private touchCurrent: { x: number; y: number } | null = null;
  private lastAlertDuration = 0;

  private fxSprites = new Set<Phaser.GameObjects.Sprite>();
  private fxTweens = new Set<Phaser.Tweens.Tween>();
  private fxTimers = new Set<Phaser.Time.TimerEvent>();
  private lastGameClock = 0;

  private damageTexts = new Map<number, Phaser.GameObjects.Text>();
  private damageTextPool: Phaser.GameObjects.Text[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  private currentChapterId = '';
  private currentHeroClass = '';

  constructor() {
    super('BattleScene');
  }

  preload() {
    const chapter=WOOWL_CHAPTERS[game.chapterId];
    this.load.on('progress', (value:number)=>this.game.events.emit('field-progress',value));
    this.load.on('loaderror', ()=>this.game.events.emit('field-error'));
    this.load.image('ground',chapter.bgImage);
    for(let tier=1;tier<=3;tier++) this.load.image('coin_'+tier, assetUrl('assets/woool/items/gold_coin_'+tier+'.png'));
    const atlas=(key:string, path:string)=>this.load.atlas(key,assetUrl(path+'@0.png'),assetUrl(path+'@0.json'));
    const hero=HERO_ATLAS_MAP[game.heroClass];
    atlas(hero,'assets/woool/heroes/r_'+hero.slice(5));
    const monsters = new Set(chapter.monsterPool.map(monster => WOOWL_MONSTERS[monster.typeId].spriteKey));
    // Every chapter opens with a few deer and scarecrows and later spawns milestone elites.
    monsters.add(WOOWL_MONSTERS.scarecrow.spriteKey);
    monsters.add(WOOWL_MONSTERS.deer.spriteKey);
    monsters.add(chapter.bossSpriteKey);
    monsters.add('20082');
    monsters.add('20085');
    for (const id of monsters) atlas('m_'+id,'assets/woool/monsters/m_'+id);
    atlas('level_up','assets/woool/effects/level_up');
    const effects=new Set(Object.values(WOOWL_SKILLS).filter(s=>s.classType===game.heroClass).map(s=>s.iconId));
    effects.delete(3303); // Uses existing summon animations.
    if(game.heroClass==='wizard') effects.add(2011);
    if(game.heroClass==='taoist'){ effects.add(2001); effects.add(1004); } // Summon fire and axe impacts.
    for(const id of effects) atlas('fx_'+id,'assets/woool/skills_fx/s_'+id);
  }

  create() {
    this.registerAllAnimations();

    this.currentChapterId=game.chapterId;
    this.add.image(0,0,'ground').setOrigin(0).setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT).setDepth(-200);
    // 3. World Boundaries
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(1);

    // 4. Graphics Layers
    this.playerShadow = this.add.graphics().setDepth(5);
    this.fxGraphics = this.add.graphics().setDepth(2000);
    this.uiGraphics = this.add.graphics().setDepth(3000);
    this.screenUiGfx = this.add.graphics().setDepth(3500).setScrollFactor(0);
    this.joystickGfx = this.add.graphics().setDepth(4500).setScrollFactor(0);

    // 5. Player Shield Sprite
    this.playerShieldSprite = this.add.sprite(game.player.x, game.player.y, '__WHITE');
    this.playerShieldSprite.setOrigin(0.5, 0.5);
    this.playerShieldSprite.setDepth(2001);
    this.playerShieldSprite.setBlendMode(Phaser.BlendModes.NORMAL);
    this.playerShieldSprite.setVisible(false);

    // 6. Player Sprite
    this.currentHeroClass = game.heroClass;
    const heroAtlas = HERO_ATLAS_MAP[this.currentHeroClass] || 'hero_5120503';
    this.playerSprite = this.add.sprite(game.player.x, game.player.y, heroAtlas);
    this.playerSprite.setOrigin(0.5, 0.5);
    this.playerSprite.setDepth(100);

    // Camera follow player smoothly
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);

    // Keyboard inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Floating Touch / Pointer Joystick Setup
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchOrigin = { x: pointer.x, y: pointer.y };
      this.touchCurrent = { x: pointer.x, y: pointer.y };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.touchOrigin && pointer.isDown) {
        this.touchCurrent = { x: pointer.x, y: pointer.y };
      }
    });

    const resetJoystick = () => {
      this.touchOrigin = null;
      this.touchCurrent = null;
      if (this.joystickGfx) this.joystickGfx.clear();
      game.setInput(0, 0);
    };

    this.input.on('pointerup', resetJoystick);
    this.input.on('pointerupoutside', resetJoystick);
    this.input.on('gameout',resetJoystick);
    this.game.events.on('clear-drag',resetJoystick);
    this.game.events.emit('field-ready');
  }

  update(_time: number, delta: number) {
    if (game.phase !== 'battle') return;
    const dt = Math.min(delta / 1000,.08);

    // Handle Input
    this.handleInput();

    // Run Engine Update
    game.update(dt);

    // Clear stale FX immediately when restarting a run or switching chapter/class
    if (
      game.phase !== 'battle' ||
      game.clock < this.lastGameClock - 0.05 ||
      this.currentChapterId !== game.chapterId ||
      this.currentHeroClass !== game.heroClass
    ) {
      this.clearTransientFx();
    }
    this.lastGameClock = game.clock;

    // Camera shake on high-threat Boss / Elite arrival
    if (game.alertBanner && game.alertBanner.duration > game.alertBanner.maxDuration - 0.15) {
      if (this.lastAlertDuration !== game.alertBanner.duration) {
        this.lastAlertDuration = game.alertBanner.duration;
        this.cameras.main.shake(game.alertBanner.type === 'boss' ? 550 : 320, game.alertBanner.type === 'boss' ? 0.012 : 0.007);
      }
    }

    // Sync Hero Sprite if class changed
    if (this.currentHeroClass !== game.heroClass) {
      this.currentHeroClass = game.heroClass;
      const heroAtlas = HERO_ATLAS_MAP[this.currentHeroClass] || 'hero_5120503';
      this.playerSprite.setTexture(heroAtlas);
    }

    // Sync Player Visuals
    this.syncPlayer();

    // Sync Monsters (with giant Elites, Supreme Boss & Glowing under-foot auras)
    this.syncMonsters();

    // Sync Minions
    this.syncMinions();

    // Sync Ground Drops (Tiered gold coin sprites)
    this.syncDrops();

    // Consume and Render Skills & Effects (Evolving with Level 1 -> 4)
    this.syncEffects(dt);

    // Sync UI (HP bars, Damage texts)
    this.syncUI(dt);
  }

  private handleInput() {
    let ix = 0;
    let iy = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd?.a.isDown) ix -= 1;
      if (this.cursors.right.isDown || this.wasd?.d.isDown) ix += 1;
      if (this.cursors.up.isDown || this.wasd?.w.isDown) iy -= 1;
      if (this.cursors.down.isDown || this.wasd?.s.isDown) iy += 1;
    }

    // Touch / Pointer Floating Joystick
    if (this.touchOrigin && this.touchCurrent) {
      const dx = this.touchCurrent.x - this.touchOrigin.x;
      const dy = this.touchCurrent.y - this.touchOrigin.y;
      const dist = Math.hypot(dx, dy);
      const maxRadius = 55;

      if (dist > 8) {
        const normX = dx / dist;
        const normY = dy / dist;
        const intensity = Math.min(1.0, (dist - 8) / (maxRadius - 8));
        ix = normX * intensity;
        iy = normY * intensity;
      }

      // Render Visual Dragon Ring Floating Joystick
      const gfx = this.joystickGfx;
      gfx.clear();

      const ox = this.touchOrigin.x;
      const oy = this.touchOrigin.y;

      // Outer Bronze Base
      gfx.fillStyle(0x0e1218, 0.45);
      gfx.fillCircle(ox, oy, 55);

      // Gold Dragon Ring
      gfx.lineStyle(3, 0xd4af37, 0.85);
      gfx.strokeCircle(ox, oy, 55);

      // Inner Rune Ring
      gfx.lineStyle(1.5, 0x8a6d3b, 0.5);
      gfx.strokeCircle(ox, oy, 28);

      // Joystick Knob
      const clampedDist = Math.min(maxRadius, dist);
      const kx = ox + (dist > 0 ? (dx / dist) * clampedDist : 0);
      const ky = oy + (dist > 0 ? (dy / dist) * clampedDist : 0);

      // Knob Shadow & Outer Body
      gfx.fillStyle(0x1a212d, 0.85);
      gfx.fillCircle(kx, ky, 22);
      gfx.lineStyle(2.5, 0xf3ba42, 0.95);
      gfx.strokeCircle(kx, ky, 22);

      // Center Amber Gem
      gfx.fillStyle(0xd35400, 0.9);
      gfx.fillCircle(kx, ky, 7);
      gfx.lineStyle(1, 0xffffff, 0.9);
      gfx.strokeCircle(kx, ky, 7);
    } else {
      if (this.joystickGfx) this.joystickGfx.clear();
    }

    game.inputX = ix;
    game.inputY = iy;
  }

  private syncPlayer() {
    this.playerSprite.setPosition(game.player.x, game.player.y);
    this.playerSprite.setDepth(game.player.y);

    const heroAtlas = HERO_ATLAS_MAP[this.currentHeroClass] || 'hero_5120503';
    const { dirDigit, flipX } = getDirInfo(game.player.dir);
    this.playerSprite.setFlipX(flipX);

    const animKey = game.player.moving
      ? `${heroAtlas}_walk_${dirDigit}`
      : `${heroAtlas}_idle_${dirDigit}`;

    if (this.anims.exists(animKey)) {
      if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim?.key !== animKey) {
        this.playerSprite.play(animKey);
      }
    }

    // Flash white when invulnerable
    if (game.player.invulnerableTime > 0) {
      const flash = Math.floor(game.clock * 20) % 2 === 0;
      this.playerSprite.setAlpha(flash ? 0.45 : 0.95);
    } else {
      this.playerSprite.setAlpha(1.0);
    }

    // Player Shadow
    this.playerShadow.clear();
    this.playerShadow.fillStyle(0x000000, 0.4);
    this.playerShadow.fillEllipse(game.player.x, game.player.y + 24, 46, 16);

    // Active Shield Visual
    if (game.clock < game.player.shieldUntil) {
      this.playerShieldSprite.setPosition(game.player.x, game.player.y);
      this.playerShieldSprite.setDepth(game.player.y + 1);
      this.playerShieldSprite.setVisible(true);
      const shield = game.heroClass === 'wizard' ? 'fx_wind_shield_cast_anim' : 'fx_diamond_body_buff_anim';
      if (this.anims.exists(shield) && !this.playerShieldSprite.anims.isPlaying) {
        this.playerShieldSprite.play(shield);
      }
    } else {
      this.playerShieldSprite.setVisible(false);
    }
  }

  private syncMonsters() {
    const activeIds = new Set<number>();

    for (const m of game.monsters) {
      activeIds.add(m.id);
      let sprite = this.monsterSprites.get(m.id);

      if (!sprite) {
        sprite = this.monsterPool.pop() || this.add.sprite(m.x, m.y, '');
        sprite.setVisible(true);
        this.monsterSprites.set(m.id, sprite);

        // Screen shake upon Boss or Milestone Elite arrival
        if (m.isBoss) {
          this.cameras.main.shake(650, 0.015);
        } else if (m.isElite && (m.scale || 1) >= 1.9) {
          this.cameras.main.shake(350, 0.008);
        }
      }

      sprite.setPosition(m.x, m.y);
      sprite.setDepth(m.y);

      const atlasKey = `m_${m.spriteKey || '20081'}`;
      const { dirDigit, flipX } = getDirInfo(m.dir || 4);
      sprite.setFlipX(flipX);

      // Scale & Imposing deterring aura
      const finalScale = m.scale || (m.isBoss ? 2.85 : (m.isElite ? 1.75 : 1.0));
      sprite.setScale(finalScale);

      // Shadow & Glowing ground aura circle under feet
      if (m.isBoss) {
        this.playerShadow.fillStyle(0x000000, 0.55);
        this.playerShadow.fillEllipse(m.x, m.y + 40, 120, 40);
      } else if (m.isElite) {
        this.playerShadow.fillStyle(0x000000, 0.5);
        this.playerShadow.fillEllipse(m.x, m.y + 32, 75, 26);
      } else {
        this.playerShadow.fillStyle(0x000000, 0.35);
        this.playerShadow.fillEllipse(m.x, m.y + 20, 42, 14);
      }

      // Status Tints
      if (m.poisonUntil && game.clock < m.poisonUntil) {
        sprite.setTint(0x66ff88);
      } else if (m.burnUntil && game.clock < m.burnUntil) {
        sprite.setTint(0xff9955);
      } else if (m.stunUntil && game.clock < m.stunUntil) {
        sprite.setTint(0xd8a8ff);
      } else if (m.slowUntil && game.clock < m.slowUntil) {
        sprite.setTint(0x88ddff);
      } else {
        sprite.clearTint();
      }

      const animKey = `${atlasKey}_walk_${dirDigit}`;
      if (this.anims.exists(animKey)) {
        if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
          sprite.play(animKey);
        }
      }
    }

    // Recycle despawned monsters
    for (const [id, sprite] of this.monsterSprites.entries()) {
      if (!activeIds.has(id)) {
        sprite.setVisible(false);
        this.monsterPool.push(sprite);
        this.monsterSprites.delete(id);
      }
    }
  }

  private syncMinions() {
    const activeIds = new Set<number>();

    for (const minion of game.minions) {
      activeIds.add(minion.id);
      let sprite = this.minionSprites.get(minion.id);

      if (!sprite) {
        sprite = this.minionPool.pop() || this.add.sprite(minion.x, minion.y, '');
        sprite.setVisible(true);
        this.minionSprites.set(minion.id, sprite);
      }

      sprite.setPosition(minion.x, minion.y);
      sprite.setDepth(minion.y);

      const atlasKey = minion.type === 'skeleton' ? 'm_20082' : 'm_20085';
      const { dirDigit, flipX } = getDirInfo(minion.dir || 4);
      sprite.setFlipX(flipX);

      const animKey = `${atlasKey}_walk_${dirDigit}`;
      if (this.anims.exists(animKey)) {
        if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
          sprite.play(animKey);
        }
      }
    }

    for (const [id, sprite] of this.minionSprites.entries()) {
      if (!activeIds.has(id)) {
        sprite.setVisible(false);
        this.minionPool.push(sprite);
        this.minionSprites.delete(id);
      }
    }
  }

  private syncDrops() {
    const activeDropIds = new Set<number>();

    for (const d of game.drops) {
      if (d.type === 'exp' || d.type === 'gold') {
        activeDropIds.add(d.id);
        let sprite = this.dropSprites.get(d.id);
        const tex = d.tier === 3 ? 'coin_3' : (d.tier === 2 ? 'coin_2' : 'coin_1');

        if (!sprite) {
          sprite = this.dropPool.pop() || this.add.sprite(d.x, d.y, tex);
          sprite.setTexture(tex);
          sprite.setOrigin(0.5, 0.7);
          sprite.setVisible(true);
          this.dropSprites.set(d.id, sprite);
        } else if (sprite.texture.key !== tex) {
          sprite.setTexture(tex);
        }

        const bob = Math.sin(game.clock * 4.5 + d.id) * 2.2;
        sprite.setPosition(d.x, d.y + bob);
        sprite.setDepth(d.y - 12);
      }
    }

    // Recycle collected drops
    for (const [id, sprite] of this.dropSprites.entries()) {
      if (!activeDropIds.has(id)) {
        sprite.setVisible(false);
        this.dropPool.push(sprite);
        this.dropSprites.delete(id);
      }
    }
  }

  private trackSprite<T extends Phaser.GameObjects.Sprite>(sprite: T): T {
    this.fxSprites.add(sprite);
    sprite.once('destroy', () => this.fxSprites.delete(sprite));
    return sprite;
  }

  private trackTween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const userOnComplete = config.onComplete;
    const tween = this.tweens.add({
      ...config,
      onComplete: (tw, targets, ...rest) => {
        this.fxTweens.delete(tw);
        if (userOnComplete) userOnComplete(tw, targets, ...rest);
      },
      onStop: (tw) => {
        this.fxTweens.delete(tw);
      }
    });
    this.fxTweens.add(tween);
    return tween;
  }

  private scheduleFx(delayMs: number, fn: () => void) {
    if (delayMs <= 0) {
      fn();
      return;
    }
    const timer = this.time.delayedCall(delayMs, () => {
      this.fxTimers.delete(timer);
      fn();
    });
    this.fxTimers.add(timer);
  }

  private clearTransientFx() {
    for (const t of this.fxTimers) t.remove(false);
    this.fxTimers.clear();
    for (const tw of this.fxTweens) tw.stop();
    this.fxTweens.clear();
    for (const sp of Array.from(this.fxSprites)) {
      if (sp && sp.scene) sp.destroy();
    }
    this.fxSprites.clear();
    if (this.playerShieldSprite) this.playerShieldSprite.setVisible(false);
  }

  private spawnSkillEffect(
    x: number,
    y: number,
    texture: string,
    animKey: string,
    depth: number,
    scale: number,
    flipX = false,
    blendMode: Phaser.BlendModes | number = Phaser.BlendModes.NORMAL
  ) {
    if (!this.anims.exists(animKey)) return;
    const fx = this.trackSprite(this.add.sprite(x, y, texture));
    fx.setOrigin(0.5, 0.5);
    fx.setDepth(depth);
    fx.setScale(scale);
    fx.setFlipX(flipX);
    fx.setBlendMode(blendMode);
    fx.play(animKey);
    fx.on('animationcomplete', () => fx.destroy());
  }

  private spawnTalismanProjectile(startX: number, startY: number, targetX: number, targetY: number, level = 1) {
    const sy = startY - 18;
    const ty = targetY - 14;
    const dist = Math.hypot(targetX - startX, ty - sy);

    const scaleMult = level === 4 ? 1.6 : (level >= 2 ? 1.25 : 0.95);

    if (this.anims.exists('fx_talisman_fly_anim') && dist > 28) {
      const proj = this.trackSprite(this.add.sprite(startX, sy, 'fx_3011'));
      proj.setOrigin(0.5, 0.5);
      proj.setScale(scaleMult);
      proj.setDepth(Math.max(startY, targetY) + 40);
      proj.setRotation(Math.atan2(ty - sy, targetX - startX));
      proj.setBlendMode(Phaser.BlendModes.NORMAL);
      proj.play('fx_talisman_fly_anim');

      const duration = Math.max(220, Math.min(400, Math.round(dist * 1.1)));
      this.trackTween({
        targets: proj,
        x: targetX,
        y: ty,
        duration,
        ease: 'Linear',
        onComplete: () => {
          proj.destroy();
          this.spawnSkillEffect(targetX, targetY + 4, 'fx_3011', 'fx_talisman_hit_anim', targetY + 25, scaleMult * 1.05);
        }
      });
    } else {
      this.spawnSkillEffect(targetX, targetY + 4, 'fx_3011', 'fx_talisman_hit_anim', targetY + 25, scaleMult * 1.05);
    }
  }

  private spawnMeteorProjectile(x: number, y: number, staggerIndex = 0, level = 1) {
    const startY = y - 360;
    const endY = y;
    const delay = staggerIndex * 135;

    const scaleMult = level === 4 ? 2.2 : (level === 3 ? 1.65 : (level === 2 ? 1.3 : 1.0));

    this.scheduleFx(delay, () => {
      if (level >= 4) {
        this.cameras.main.shake(200, 0.007);
      }
      if (this.anims.exists('fx_meteor_drop_anim')) {
        const drop = this.trackSprite(this.add.sprite(x, startY, 'fx_2202'));
        drop.setOrigin(0.5, 0.5);
        drop.setScale(scaleMult);
        drop.setDepth(y + 30);
        drop.setBlendMode(Phaser.BlendModes.NORMAL);
        drop.play('fx_meteor_drop_anim');

        this.trackTween({
          targets: drop,
          x,
          y: endY,
          duration: 120,
          ease: 'Quad.easeIn',
          onComplete: () => {
            drop.destroy();
            this.spawnSkillEffect(x, endY, 'fx_2202', 'fx_meteor_boom_anim', y + 35, scaleMult * 0.95);
            this.spawnSkillEffect(x, y - 16, 'fx_2011', 'fx_meteor_cast_anim', y + 42, scaleMult * 0.7);
          }
        });
      } else {
        this.spawnSkillEffect(x, y - 16, 'fx_2011', 'fx_meteor_cast_anim', y + 42, scaleMult * 0.7);
      }
    });
  }

  private spawnDashEffect(startX: number, startY: number, targetX: number, targetY: number, dir: number, level = 1) {
    const heroAtlas = HERO_ATLAS_MAP[this.currentHeroClass] || 'hero_5110501';
    const currentFrame = this.playerSprite.frame?.name;
    const { dirDigit, flipX } = getDirInfo(dir);

    const scaleMult = level >= 4 ? 2.1 : (level >= 2 ? 1.5 : 1.25);

    if (currentFrame) {
      for (const t of [0.22, 0.52, 0.8]) {
        const ax = startX + (targetX - startX) * t;
        const ay = startY + (targetY - startY) * t;
        const ghost = this.trackSprite(this.add.sprite(ax, ay, heroAtlas, currentFrame));
        ghost.setOrigin(0.5, 0.5);
        ghost.setFlipX(flipX);
        ghost.setDepth(ay - 1);
        ghost.setTint(level >= 4 ? 0xffcc00 : 0x66ccff);
        ghost.setAlpha(0.65);
        this.trackTween({
          targets: ghost,
          alpha: 0,
          duration: 250,
          ease: 'Quad.easeOut',
          onComplete: () => ghost.destroy()
        });
      }
    }

    const animKey = `fx_dash_anim_d${dirDigit}`;
    if (!this.anims.exists(animKey)) return;

    const streak = this.trackSprite(this.add.sprite(startX, startY, 'fx_1010'));
    streak.setOrigin(0.5, 0.5);
    streak.setScale(scaleMult);
    streak.setFlipX(flipX);
    streak.setDepth(Math.max(startY, targetY) + 25);
    streak.play(animKey);
    streak.on('animationcomplete', () => streak.destroy());
    this.trackTween({
      targets: streak,
      x: targetX,
      y: targetY,
      duration: 135,
      ease: 'Quad.easeOut'
    });

    this.scheduleFx(45, () => {
      this.spawnSkillEffect(targetX, targetY, 'fx_1010', animKey, targetY + 30, scaleMult * 1.1, flipX);
    });
  }

  private syncEffects(_dt: number) {
    const directionalFx: Record<string, { tex: string; baseAnim: string; dy?: number; dDepth?: number; scale: number; followPlayer?: boolean }> = {
      blade_arc: { tex: 'fx_1004', baseAnim: 'fx_blade_arc_anim', dy: 4, dDepth: 18, scale: 1.22, followPlayer: true },
      fire_slash: { tex: 'fx_1006', baseAnim: 'fx_fire_slash_anim', dy: 2, dDepth: 30, scale: 1.2 },
      skeleton_hit: { tex: 'fx_1004', baseAnim: 'fx_blade_arc_anim', dy: 6, dDepth: 16, scale: 0.72 },
      attack_slash: { tex: 'fx_1002', baseAnim: 'fx_attack_slash_anim', dy: 2, dDepth: 20, scale: 1.15, followPlayer: true },
      assassination_sword: { tex: 'fx_1003', baseAnim: 'fx_assassination_sword_anim', dy: 2, dDepth: 25, scale: 1.25 },
      thunder_sword: { tex: 'fx_1102', baseAnim: 'fx_thunder_sword_anim', dy: -4, dDepth: 35, scale: 1.4 }
    };

    const fxTable: Record<string, { tex: string; anim: string; dy?: number; dDepth?: number; scale?: number; followPlayer?: boolean }> = {
      level_up: { tex: 'level_up', anim: 'fx_level_up_anim', dy: -40, dDepth: 100, scale: 1.2 },
      lightning: { tex: 'fx_2010', anim: 'fx_lightning_anim', dy: 14, dDepth: 200, scale: 0.85 },
      hell_thunder: { tex: 'fx_2003', anim: 'fx_hell_thunder_anim', dy: -6, dDepth: 15, scale: 1.0, followPlayer: true },
      poison: { tex: 'fx_3004', anim: 'fx_poison_anim', dy: -14, dDepth: 18, scale: 1.05 },
      diamond_body: { tex: 'fx_1008', anim: 'fx_diamond_body_cast_anim', dy: -6, dDepth: 12, scale: 1.25, followPlayer: true },
      wind_shield: { tex: 'fx_2009', anim: 'fx_wind_shield_cast_anim', dy: -6, dDepth: 12, scale: 1.25, followPlayer: true },
      shinsu: { tex: 'fx_3007', anim: 'fx_shinsu_anim', dy: 6, dDepth: 20, scale: 1.15 },
      shinsu_hit: { tex: 'fx_2001', anim: 'fx_shinsu_hit_anim', dy: -10, dDepth: 25, scale: 0.78 },
      skeleton: { tex: 'fx_3012', anim: 'fx_skeleton_anim', dy: 10, dDepth: 20, scale: 0.88 },
      ice_roar: { tex: 'fx_2008', anim: 'fx_ice_roar_anim', dy: 0, dDepth: 30, scale: 1.35 },
      fireball: { tex: 'fx_2001', anim: 'fx_fireball_anim', dy: -8, dDepth: 25, scale: 0.95 },
      lightning_strike: { tex: 'fx_2005', anim: 'fx_lightning_strike_anim', dy: 6, dDepth: 30, scale: 1.1 },
      hellfire: { tex: 'fx_2004', anim: 'fx_hellfire_anim', dy: 0, dDepth: 25, scale: 1.35 },
      heal_spell: { tex: 'fx_3001', anim: 'fx_heal_spell_anim', dy: -12, dDepth: 35, scale: 1.1, followPlayer: true },
      summon_skeleton: { tex: 'fx_3003', anim: 'fx_summon_skeleton_anim', dy: 4, dDepth: 20, scale: 1.05 },
      ghost_fire_curse: { tex: 'fx_3008', anim: 'fx_ghost_fire_curse_anim', dy: -6, dDepth: 25, scale: 1.1 }
    };

    const newEffects = game.takeEffects();
    const castPlayedThisTick = new Set<string>();
    let meteorIndex = 0;

    for (const e of newEffects) {
      const lvl = e.level || 1;
      const levelMult = lvl === 4 ? 2.15 : (lvl === 3 ? 1.65 : (lvl === 2 ? 1.3 : 1.0));

      if (lvl >= 4) {
        this.cameras.main.shake(220, 0.006);
      }

      if (e.type === 'lightning' && !castPlayedThisTick.has('lightning')) {
        castPlayedThisTick.add('lightning');
        this.spawnSkillEffect(
          this.playerSprite.x,
          this.playerSprite.y - 6,
          'fx_2010',
          'fx_lightning_cast_anim',
          this.playerSprite.y + 15,
          1.05 * levelMult
        );
      }

      if (e.type === 'poison' && !castPlayedThisTick.has('poison')) {
        castPlayedThisTick.add('poison');
        this.spawnSkillEffect(
          this.playerSprite.x,
          this.playerSprite.y - 8,
          'fx_3004',
          'fx_poison_cast_anim',
          this.playerSprite.y + 15,
          0.85 * levelMult
        );
      }

      if (e.type === 'talisman') {
        if (!castPlayedThisTick.has('talisman')) {
          castPlayedThisTick.add('talisman');
          this.spawnSkillEffect(
            this.playerSprite.x,
            this.playerSprite.y + 16,
            'fx_3011',
            'fx_talisman_cast_anim',
            this.playerSprite.y - 1,
            0.85 * levelMult
          );
        }
        if (e.targetX !== undefined && e.targetY !== undefined) {
          this.spawnTalismanProjectile(e.x, e.y, e.targetX, e.targetY, lvl);
        }
        continue;
      }

      if (e.type === 'meteor') {
        this.spawnMeteorProjectile(e.x, e.y, meteorIndex++, lvl);
        continue;
      }

      if (e.type === 'dash') {
        this.spawnDashEffect(e.x, e.y, e.targetX ?? e.x, e.targetY ?? e.y, e.dir ?? 4, lvl);
        continue;
      }

      const dirCfg = directionalFx[e.type];
      if (dirCfg) {
        const rawDir = e.dir !== undefined ? e.dir : ((this.playerSprite as any)?.currentDir ?? 4);
        const { dirDigit, flipX } = getDirInfo(rawDir);
        const animKey = `${dirCfg.baseAnim}_d${dirDigit}`;
        const sx = dirCfg.followPlayer ? this.playerSprite.x : e.x;
        const sy = dirCfg.followPlayer ? this.playerSprite.y : e.y;
        this.spawnSkillEffect(
          sx,
          sy + (dirCfg.dy || 0),
          dirCfg.tex,
          animKey,
          sy + (dirCfg.dDepth || 0),
          dirCfg.scale * levelMult,
          flipX
        );
        continue;
      }

      const cfg = fxTable[e.type];
      if (!cfg) continue;

      const sx = cfg.followPlayer ? this.playerSprite.x : e.x;
      const sy = cfg.followPlayer ? this.playerSprite.y : e.y;
      let scale = (cfg.scale || 1.0) * levelMult;
      if (e.radius && e.type === 'hell_thunder') {
        scale = Math.max(0.85, (e.radius / 165) * levelMult);
      } else if (e.radius && e.type === 'poison') {
        scale = Math.max(0.92, (e.radius / 115) * levelMult);
      }

      this.spawnSkillEffect(
        sx,
        sy + (cfg.dy || 0),
        cfg.tex,
        cfg.anim,
        sy + (cfg.dDepth || 0),
        scale
      );
    }
  }

  private syncUI(_dt: number) {
    const gfx = this.uiGraphics;
    gfx.clear();

    // 1. Glowing ground aura circle under feet of Elites and Boss
    for (const m of game.monsters) {
      if (m.isBoss || m.isElite) {
        const auraRadius = (m.isBoss ? 82 : 46) + Math.sin(game.clock * 5) * 5;
        const auraColor = m.isBoss ? 0xff0033 : 0xff9900;
        gfx.lineStyle(m.isBoss ? 3.5 : 2.5, auraColor, 0.9);
        gfx.strokeCircle(m.x, m.y + (m.isBoss ? 35 : 24), auraRadius);
        gfx.fillStyle(auraColor, m.isBoss ? 0.22 : 0.16);
        gfx.fillCircle(m.x, m.y + (m.isBoss ? 35 : 24), auraRadius);

        // Inner glowing ring
        gfx.lineStyle(1.5, 0xffe58f, 0.7);
        gfx.strokeCircle(m.x, m.y + (m.isBoss ? 35 : 24), auraRadius * 0.65);
      }
    }

    // 2. Monster overhead health bars
    for (const m of game.monsters) {
      if (m.hp < m.maxHp || m.isElite || m.isBoss) {
        const barW = m.isBoss ? 90 : (m.isElite ? 55 : 36);
        const barH = m.isBoss ? 7 : (m.isElite ? 5 : 4);
        const bx = m.x - barW / 2;
        const by = m.y - (m.isBoss ? 85 : (m.isElite ? 62 : 45));

        // Bar frame
        gfx.fillStyle(0x000000, 0.75);
        gfx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

        if (m.isElite) {
          gfx.lineStyle(1.5, 0xffbb00, 0.9);
          gfx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
        }

        // HP fill
        const ratio = Math.max(0, m.hp / m.maxHp);
        gfx.fillStyle(m.isBoss ? 0xff0033 : (m.isElite ? 0xff9900 : 0xdd3333), 0.95);
        gfx.fillRect(bx, by, barW * ratio, barH);
      }
    }

    // 3. Potion drops (red bottle)
    for (const d of game.drops) {
      if (d.type === 'potion') {
        gfx.fillStyle(0xff2244, 0.95);
        gfx.fillRect(d.x - 4, d.y - 6, 8, 12);
        gfx.fillStyle(0xffffff, 0.85);
        gfx.fillRect(d.x - 2, d.y - 4, 3, 3);
        gfx.fillStyle(0xa66300, 1.0);
        gfx.fillRect(d.x - 2, d.y - 8, 4, 2);
      }
    }

    // 4. Floating Damage Numbers
    const activeTextIds = new Set<number>();
    for (const d of game.damageNumbers) {
      activeTextIds.add(d.id);
      let textObj = this.damageTexts.get(d.id);

      if (!textObj) {
        textObj = this.damageTextPool.pop() || this.add.text(d.x, d.y, d.text, {
          fontFamily: 'serif',
          fontSize: d.crit ? '20px' : '15px',
          fontStyle: 'bold',
          color: d.color,
          stroke: '#000000',
          strokeThickness: 3
        });
        textObj.setOrigin(0.5, 0.5);
        textObj.setDepth(3500);
        textObj.setVisible(true);
        this.damageTexts.set(d.id, textObj);
      }

      textObj.setPosition(d.x, d.y);
      textObj.setText(d.text);
      textObj.setColor(d.color);
      textObj.setAlpha(Math.min(1, d.life / 0.3));
    }

    for (const [id, textObj] of this.damageTexts.entries()) {
      if (!activeTextIds.has(id)) {
        textObj.setVisible(false);
        this.damageTextPool.push(textObj);
        this.damageTexts.delete(id);
      }
    }

    // 5. Offscreen Elite & Boss Direction Indicators
    const screenGfx = this.screenUiGfx;
    screenGfx.clear();

    const cam = this.cameras.main;
    const viewL = cam.worldView.x;
    const viewR = cam.worldView.x + cam.worldView.width;
    const viewT = cam.worldView.y;
    const viewB = cam.worldView.y + cam.worldView.height;
    const screenW = cam.width;
    const screenH = cam.height;
    const screenCenterX = screenW / 2;
    const screenCenterY = screenH / 2;

    for (const m of game.monsters) {
      if ((m.isBoss || m.isElite) && m.hp > 0) {
        const isOffscreen = m.x < viewL || m.x > viewR || m.y < viewT || m.y > viewB;
        if (isOffscreen) {
          const worldDx = m.x - game.player.x;
          const worldDy = m.y - game.player.y;
          const ang = Math.atan2(worldDy, worldDx);

          // Margin from screen boundary
          const margin = 42;
          const halfW = (screenW / 2) - margin;
          const halfH = (screenH / 2) - margin;

          let ix = screenCenterX;
          let iy = screenCenterY;

          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const tanA = Math.tan(ang);

          if (Math.abs(cosA) * halfH > Math.abs(sinA) * halfW) {
            ix = screenCenterX + Math.sign(cosA) * halfW;
            iy = screenCenterY + Math.sign(cosA) * halfW * tanA;
          } else {
            iy = screenCenterY + Math.sign(sinA) * halfH;
            ix = screenCenterX + (Math.sign(sinA) * halfH) / (tanA || 0.0001);
          }

          const arrowColor = m.isBoss ? 0xff0033 : 0xffaa00;
          const pulse = Math.sin(game.clock * 8) * 3;
          const arrowSize = (m.isBoss ? 16 : 12) + pulse;

          // Oriented triangle pointing towards enemy
          const ax = ix + cosA * arrowSize;
          const ay = iy + sinA * arrowSize;
          const bx = ix + Math.cos(ang + 2.4) * arrowSize;
          const by = iy + Math.sin(ang + 2.4) * arrowSize;
          const cx = ix + Math.cos(ang - 2.4) * arrowSize;
          const cy = iy + Math.sin(ang - 2.4) * arrowSize;

          screenGfx.fillStyle(arrowColor, 0.95);
          screenGfx.fillTriangle(ax, ay, bx, by, cx, cy);
          screenGfx.lineStyle(2, 0xffffff, 0.95);
          screenGfx.strokeTriangle(ax, ay, bx, by, cx, cy);

          // Indicator glow circle
          screenGfx.fillStyle(arrowColor, 0.35);
          screenGfx.fillCircle(ix, iy, arrowSize * 0.85);
        }
      }
    }
  }

  private createAnimFromAtlas(
    animKey: string,
    atlasKey: string,
    prefix: string,
    frameRate: number,
    repeat = 0
  ) {
    if (this.anims.exists(animKey)) return;
    if (!this.textures.exists(atlasKey)) return;
    const tex = this.textures.get(atlasKey);
    const frameNames = tex.getFrameNames().filter(f => f.startsWith(prefix)).sort();
    if (frameNames.length === 0) return;

    this.anims.create({
      key: animKey,
      frames: frameNames.map(f => ({ key: atlasKey, frame: f })),
      frameRate,
      repeat
    });
  }

  private registerAllAnimations() {
    // 1. Hero Walking (Run) & Idle (Stand) Animations
    const heroList = [
      { key: 'hero_5110501', id: '5110501' },
      { key: 'hero_5120503', id: '5120503' },
      { key: 'hero_5130503', id: '5130503' }
    ];
    for (const h of heroList) {
      for (let dir = 0; dir <= 4; dir++) {
        this.createAnimFromAtlas(`${h.key}_walk_${dir}`, h.key, `role/${h.id}/run/${dir}`, 12, -1);
        this.createAnimFromAtlas(`${h.key}_idle_${dir}`, h.key, `role/${h.id}/stand/${dir}`, 4, -1);
      }
    }

    // 2. Monster Walking Animations
    for (const id of ['20038', '20046', '20072', '20081', '20082', '20085', '20111', '20112']) {
      const atlasKey = `m_${id}`;
      for (let dir = 0; dir <= 4; dir++) {
        this.createAnimFromAtlas(`${atlasKey}_walk_${dir}`, atlasKey, `${id}/walk/${dir}`, 8, -1);
        this.createAnimFromAtlas(`${atlasKey}_idle_${dir}`, atlasKey, `${id}/stand/${dir}`, 4, -1);
      }
    }

    // 3. Directional Slashes & Dash
    for (let d = 0; d <= 4; d++) {
      this.createAnimFromAtlas(`fx_blade_arc_anim_d${d}`, 'fx_1004', `1004/attack/${d}`, 15, 0);
      this.createAnimFromAtlas(`fx_fire_slash_anim_d${d}`, 'fx_1006', `1006/attack/${d}`, 15, 0);
      this.createAnimFromAtlas(`fx_dash_anim_d${d}`, 'fx_1010', `1010/attack/${d}`, 16, 0);
      this.createAnimFromAtlas(`fx_attack_slash_anim_d${d}`, 'fx_1002', `1002/attack/${d}`, 16, 0);
      this.createAnimFromAtlas(`fx_assassination_sword_anim_d${d}`, 'fx_1003', `1003/attack/${d}`, 16, 0);
      this.createAnimFromAtlas(`fx_thunder_sword_anim_d${d}`, 'fx_1102', `1102/attack/${d}`, 16, 0);
    }

    // 4. Authentic Skill Effects
    this.createAnimFromAtlas('fx_level_up_anim', 'level_up', 'level_up/', 15, 0);
    this.createAnimFromAtlas('fx_lightning_anim', 'fx_2010', '2010/hit/', 16, 0);
    this.createAnimFromAtlas('fx_lightning_cast_anim', 'fx_2010', '2010/casting/', 15, 0);
    this.createAnimFromAtlas('fx_ice_roar_anim', 'fx_2008', '2008/hit/', 16, 0);
    this.createAnimFromAtlas('fx_fireball_anim', 'fx_2001', '2001/hit/', 15, 0);
    this.createAnimFromAtlas('fx_lightning_strike_anim', 'fx_2005', '2005/hit/', 16, 0);
    this.createAnimFromAtlas('fx_hellfire_anim', 'fx_2004', '2004/loop/', 15, 0);
    this.createAnimFromAtlas('fx_heal_spell_anim', 'fx_3001', '3001/hit/', 14, 0);
    this.createAnimFromAtlas('fx_summon_skeleton_anim', 'fx_3003', '3003/hit/', 14, 0);
    this.createAnimFromAtlas('fx_ghost_fire_curse_anim', 'fx_3008', '3008/hit/', 15, 0);
    this.createAnimFromAtlas('fx_hell_thunder_anim', 'fx_2003', '2003/hit/', 16, 0);
    this.createAnimFromAtlas('fx_poison_anim', 'fx_3004', '3004/hit/', 12, 0);
    this.createAnimFromAtlas('fx_poison_cast_anim', 'fx_3004', '3004/casting/', 14, 0);
    this.createAnimFromAtlas('fx_diamond_body_buff_anim', 'fx_1008', '1008/loop/', 10, -1);
    this.createAnimFromAtlas('fx_diamond_body_cast_anim', 'fx_1008', '1008/casting/', 14, 0);
    this.createAnimFromAtlas('fx_wind_shield_cast_anim', 'fx_2009', '2009/loop/', 12, -1);
    this.createAnimFromAtlas('fx_shinsu_anim', 'fx_3007', '3007/hit/', 14, 0);
    this.createAnimFromAtlas('fx_shinsu_hit_anim', 'fx_2001', '2001/hit/', 14, 0);
    this.createAnimFromAtlas('fx_skeleton_anim', 'fx_3012', '3012/hit/', 13, 0);
    this.createAnimFromAtlas('fx_meteor_boom_anim', 'fx_2202', '2202/hit/', 16, 0);
    this.createAnimFromAtlas('fx_meteor_drop_anim', 'fx_2202', '2202/track/', 16, 0);
    this.createAnimFromAtlas('fx_meteor_cast_anim', 'fx_2011', '2011/casting/', 14, 0);
    this.createAnimFromAtlas('fx_talisman_fly_anim', 'fx_3011', '3011/track/', 14, -1);
    this.createAnimFromAtlas('fx_talisman_hit_anim', 'fx_3011', '3011/hit/', 15, 0);
    this.createAnimFromAtlas('fx_talisman_cast_anim', 'fx_3011', '3011/casting/', 14, 0);
  }
}

export function bootField(onProgress:(value:number)=>void,onReady:()=>void,onError:()=>void) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'world',
    backgroundColor: '#0c0f12',
    pixelArt: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight
    },
    scene: [BattleScene],
    audio: { noAudio: true },
    fps: { target: 60 }
  };

  return new Phaser.Game({...config, callbacks:{preBoot(engine){
    engine.events.on('field-progress',onProgress);
    engine.events.once('field-ready',onReady);
    engine.events.once('field-error',onError);
  }}});
}
