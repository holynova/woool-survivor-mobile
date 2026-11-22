import {WOOWL_CHAPTERS} from './config/chapters';
import {WOOWL_MONSTERS} from './config/curves';
import {WOOWL_SKILLS} from './config/skills';
import { bossKits, CHARGE_RADIUS } from './boss';
import { missiles } from './ranged';
import { bossPose } from './bossPose';
import Phaser from 'phaser';
import { game, calcDirection, WORLD_WIDTH, WORLD_HEIGHT } from './game';
import type { EffectEvent, FlightKind, MonsterEntity, MinionEntity, DropEntity, DamageNumber } from './types';
import { gearTier, registerArmorAnimations } from './combatArt';
import { gearInfo, gearColors } from './config/equipment';
import { assetUrl } from './utils';
import { buildField, preloadField } from './battlefield';
import { FieldAssets } from './fieldAssets';
import { reducedMotion } from './motion';
import { preloadEquipmentArt } from './combatArt';
import { FOOT_OFFSET } from './terrain';

// Logical scale and original foot pivot in the walk rig, independent of atlas density.
const bossRig: Record<string, {scale:number; foot:number}> = {
  '20082':{scale:1.95,foot:43}, '20111':{scale:2.38,foot:34},
  '20046':{scale:2.5,foot:35}, '20038':{scale:2.25,foot:53},
  '20072':{scale:2.26,foot:29}, '20085':{scale:1.68,foot:45},
  hydra_king:{scale:2.85,foot:20}, sky_pontiff:{scale:2.43,foot:21}
};

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
  private weapon!: Phaser.GameObjects.Image;
  private groundFx!: Phaser.GameObjects.Graphics;
  private dangerRings: Phaser.GameObjects.Image[] = [];
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

  private pixelRatio=1;
  private updateCover!: ReturnType<typeof buildField>;
  private stagedAssets!: FieldAssets;
  private currentChapterId = '';
  private currentHeroClass = '';

  constructor() {
    super('BattleScene');
  }

  preload() {
    const progress=(value:number)=>this.game.events.emit('field-progress',value);
    this.load.on('progress',progress);
    this.load.once('complete',()=>this.load.off('progress',progress));
    const failed=()=>this.game.events.emit('field-error');
    this.load.on('loaderror',failed);
    this.load.once('complete',()=>this.load.off('loaderror',failed));
    preloadField(this,game.terrain);
    this.load.image('healing-potion',assetUrl('assets/woool/items/healing_potion.webp'));
    this.load.image('coin-string',assetUrl('assets/woool/items/coin_string.webp'));
    for(let tier=1;tier<=3;tier++) this.load.image('coin_'+tier, assetUrl('assets/woool/items/gold_coin_'+tier+'.png'));
    for (const slot of ['weapon','armor'] as const) {
      const icons = new Set([0,1,3].map(rank => gearInfo(game.heroClass,slot,rank).icon));
      for (const icon of icons) this.load.image('gear_'+icon,assetUrl('assets/woool/items/'+icon+'.png'));
    }
    const atlas=(key:string, path:string)=>this.load.atlas(key,assetUrl(path+'@0.png'),assetUrl(path+'@0.json'));
    const hero=HERO_ATLAS_MAP[game.heroClass];
    atlas(hero,'assets/woool/heroes/r_'+hero.slice(5));
    preloadEquipmentArt(this,game.heroClass);
    this.stagedAssets=new FieldAssets(this,()=>this.registerAllAnimations());
    this.stagedAssets.preload();
    this.load.atlas('level_up',assetUrl('assets/woool/effects/level_up@0.webp'),assetUrl('assets/woool/effects/level_up@0.json'));
  }

  create() {
    this.registerAllAnimations();
    this.stagedAssets.start();

    this.currentChapterId=game.chapterId;
    this.updateCover=buildField(this,game.terrain);
    // 3. World Boundaries
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);


    // 4. Graphics Layers
    this.groundFx = this.add.graphics().setPosition(0,FOOT_OFFSET).setDepth(4);
    this.weapon = this.add.image(game.player.x,game.player.y,'gear_5010101').setOrigin(.79,.80).setScale(.72);
    this.playerShadow = this.add.graphics().setDepth(5);
    this.fxGraphics = this.add.graphics().setDepth(2000);
    this.uiGraphics = this.add.graphics().setDepth(3000);
    this.screenUiGfx = this.add.graphics().setDepth(3500).setScrollFactor(0);
    this.joystickGfx = this.add.graphics().setDepth(4500).setScrollFactor(0);

    const resizeField = () => {
      const cam=this.cameras.main;
      this.pixelRatio=cam.width/Math.max(1,this.game.canvas.getBoundingClientRect().width);
      const zoom=Math.max(.75*this.pixelRatio,cam.width/WORLD_WIDTH,cam.height/WORLD_HEIGHT);
      cam.setZoom(zoom);
      for (const layer of [this.joystickGfx,this.screenUiGfx]) {
        layer.setScale(this.pixelRatio/zoom).setPosition(cam.width/2*(1-1/zoom),cam.height/2*(1-1/zoom));
      }
    };
    resizeField();
    this.scale.on('resize',resizeField);
    this.events.once('shutdown',()=>this.scale.off('resize',resizeField));

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
    this.cameras.main.startFollow(this.playerSprite, false, 0.1, 0.1);

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
      this.touchOrigin = { x: pointer.x/this.pixelRatio, y: pointer.y/this.pixelRatio };
      this.touchCurrent = { x: pointer.x/this.pixelRatio, y: pointer.y/this.pixelRatio };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.touchOrigin && pointer.isDown) {
        this.touchCurrent = { x: pointer.x/this.pixelRatio, y: pointer.y/this.pixelRatio };
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
    this.cameras.main.centerOn(game.player.x, game.player.y);
    this.updateCover(game.player,game.monsters,game.dangers);
    this.syncPlayer();
    this.syncMonsters();
    this.syncMinions();
    this.syncDrops();
    this.syncUI(0);
    this.game.events.emit('field-ready');
  }

  update(_time: number, delta: number) {
    if (!this.stagedAssets.update() || game.phase !== 'battle') return;
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
      if (!reducedMotion() && this.lastAlertDuration !== game.alertBanner.duration) {
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
    this.updateCover(game.player,game.monsters,game.dangers);
    this.syncPlayer();

    // Sync Monsters (with giant Elites, Supreme Boss & Glowing under-foot auras)
    this.syncMonsters();

    // Sync Minions
    this.syncMinions();

    // Sync Ground Drops (Tiered gold coin sprites)
    this.syncDrops();

    // Consume and Render Skills & Effects (Evolving with Level 1 -> 4)
    this.syncFlights();
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
    const armorTier=gearTier(game.equipment.armor), action=game.player.moving ? 'run' : 'stand';
    const animKey = armorTier
      ? 'outfit_'+this.currentHeroClass+'_r_'+armorTier+'_'+action+'_'+dirDigit
      : heroAtlas+(game.player.moving ? '_walk_' : '_idle_')+dirDigit;
    if (this.anims.exists(animKey) && this.playerSprite.anims.currentAnim?.key !== animKey) {
      this.playerSprite.play(animKey);
    }
    this.playerSprite.clearTint();
    const pose=String(this.playerSprite.frame.name).split('/').pop();
    const weaponFrame='w'+gearTier(game.equipment.weapon)+'/'+action+'/'+pose;
    this.weapon.setTexture('outfit_'+this.currentHeroClass+'_w',weaponFrame)
      .setOrigin(.5,.5).setScale(1).setFlipX(flipX).clearTint()
      .setPosition(game.player.x,game.player.y)
      .setDepth(game.player.y+(dirDigit<2 ? -1 : 1));

    // Flash white when invulnerable
    if (game.player.invulnerableTime > 0) {
      const flash = Math.floor(game.clock * 20) % 2 === 0;
      this.playerSprite.setAlpha(flash ? 0.45 : 0.95);
    } else {
      this.playerSprite.setAlpha(1.0);
    }

    this.weapon.setAlpha(this.playerSprite.alpha);

    // Player Shadow
    this.playerShadow.clear();
    this.playerShadow.fillStyle(0x000000, 0.4);
    this.playerShadow.fillEllipse(game.player.x, game.player.y + FOOT_OFFSET, 46, 16);

    // Active Shield Visual
    if (game.clock < game.player.shieldUntil) {
      this.playerShieldSprite.setPosition(game.player.x, game.player.y);
      this.playerShieldSprite.setDepth(game.player.y + 1);
      this.playerShieldSprite.setVisible(true);
      const shield = game.heroClass === 'wizard' ? 'fx_wind_shield_cast_anim' : 'fx_diamond_body_buff_anim';
      if (this.anims.exists(shield) && !this.playerShieldSprite.anims.isPlaying) {
        this.playerShieldSprite.setScale(this.effectScale(shield,1)).play(shield);
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
        sprite.setData('strikeAt',-Infinity);
        sprite.setData('strikeEnd',-Infinity);
      }

      const rig=m.isBoss ? bossRig[m.spriteKey!] : undefined;
      const actorY=rig ? m.y+FOOT_OFFSET-rig.foot*rig.scale : m.y;
      const traveled=Math.hypot(sprite.x-m.x,sprite.y-actorY);
      sprite.setPosition(m.x, actorY).setRotation(0);
      sprite.setDepth(m.y);

      const atlasKey = (rig ? 'boss_' : 'm_')+(m.spriteKey || '20081');
      const cast=m.isBoss ? m.bossCast : undefined;
      let facing=m.dir ?? 4;
      if(cast){
        facing=cast.kind==='volley' ? calcDirection(Math.cos(cast.angle),Math.sin(cast.angle))
          : cast.kind==='charge' ? calcDirection(cast.to.x-cast.from.x,cast.to.y-cast.from.y)
          : calcDirection(game.player.x-m.x,game.player.y-m.y);
        const nextImpact=cast.kind==='ground' ? game.dangers.find(z=>z.owner===m.id && z.impact>=game.clock-.12)?.impact : undefined;
        sprite.setData('strikeAt',nextImpact ?? cast.releaseAt);
        sprite.setData('strikeEnd',cast.releaseAt+(cast.kind==='charge' ? .52 : 0)+.26);
        sprite.setData('strikeFacing',facing);
        sprite.setData('strikeKind',cast.kind);
      }
      const casting=m.isBoss && game.clock<sprite.getData('strikeEnd');
      if(casting) facing=sprite.getData('strikeFacing');
      const { dirDigit, flipX } = getDirInfo(facing);
      const singleView = !this.anims.exists(atlasKey+'_walk_0');
      sprite.setFlipX(singleView ? facing < 4 : flipX);

      // Scale & Imposing deterring aura
      const finalScale = rig?.scale ?? m.scale ?? 1;
      sprite.setScale(rig ? finalScale/2 : finalScale);

      // Shadow & Glowing ground aura circle under feet
      if (m.isBoss) {
        this.playerShadow.fillStyle(0x221b15,.15).fillEllipse(m.x+4,m.y+FOOT_OFFSET,85,25);
        this.playerShadow.fillStyle(0x221b15,.18).fillEllipse(m.x,m.y+FOOT_OFFSET,58,15);
      } else if (m.isElite) {
        this.playerShadow.fillStyle(0x000000, 0.5);
        this.playerShadow.fillEllipse(m.x, m.y + 32, 75, 26);
      } else {
        this.playerShadow.fillStyle(0x000000, 0.35);
        this.playerShadow.fillEllipse(m.x, m.y + 20, 42, 14);
      }

      // Status Tints
      if (m.poisonUntil && game.clock < m.poisonUntil) {
        sprite.setTint(0xcf6684);
      } else if (m.burnUntil && game.clock < m.burnUntil) {
        sprite.setTint(0xff9955);
      } else if (m.stunUntil && game.clock < m.stunUntil) {
        sprite.setTint(0xd8a8ff);
      } else if (m.slowUntil && game.clock < m.slowUntil) {
        sprite.setTint(0x88ddff);
      } else {
        sprite.clearTint();
      }

      if(casting){
        const attackKey='bossCast_'+m.spriteKey+'_attack_'+(singleView ? 3 : dirDigit);
        if(this.anims.exists(attackKey)){
          const frames=this.anims.get(attackKey).frames;
          const impact=sprite.getData('strikeAt'), end=sprite.getData('strikeEnd');
          const posed=bossPose(sprite.getData('strikeKind'),game.clock,impact,end-.26,frames.length,facing,rig!.foot*finalScale,m.spriteKey);
          const pose=frames[posed.frame];
          sprite.anims.stop();
          sprite.setTexture(pose.textureKey,pose.textureFrame)
            .setScale(finalScale/2*posed.width,finalScale/2*posed.height)
            .setRotation(posed.angle)
            .setPosition(m.x+posed.xOffset,m.y+FOOT_OFFSET+posed.yOffset);
          continue;
        }
      }
      const animKey = `${atlasKey}_walk_${singleView ? 3 : dirDigit}`;
      if (this.anims.exists(animKey)) {
        if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
          sprite.play(animKey);
        }
        const dt=Math.max(.001,Math.min(this.game.loop.delta/1000,.08));
        sprite.anims.timeScale=m.aim ? .75 : traveled<.05 ? 0 : Phaser.Math.Clamp(traveled/dt/(105*finalScale),.42,1.25);
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

      const atlasKey = {skeleton: 'm_20081', enhanced_skeleton: 'm_20082', shinsu: 'm_20085'}[minion.type];
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
      if (this.cameras.main.worldView.contains(d.x,d.y)) {
        activeDropIds.add(d.id);
        let sprite = this.dropSprites.get(d.id);
        const tex = d.type === 'gold' ? 'coin-string' : d.type === 'potion' ? 'healing-potion' : d.type === 'gear' && d.slot ? 'gear_'+gearInfo(game.heroClass,d.slot,d.value).icon : d.tier === 3 ? 'coin_3' : (d.tier === 2 ? 'coin_2' : 'coin_1');

        if (!sprite) {
          sprite = this.dropPool.pop() || this.add.sprite(d.x, d.y, tex);
          sprite.setTexture(tex);
          sprite.setOrigin(.5,.78);
          sprite.setVisible(true);
          this.dropSprites.set(d.id, sprite);
        } else if (sprite.texture.key !== tex) {
          sprite.setTexture(tex);
        }

        sprite.setScale(d.type === 'potion' ? .43 : d.type === 'gear' ? .62 : 1);
        sprite.clearTint();
        const feet=d.y+FOOT_OFFSET;
        const landed=d.droppedAt===undefined ? 1 : Phaser.Math.Clamp((game.clock-d.droppedAt)/.24,0,1);
        const lift=(1-landed)*(11+18*landed);
        const radius=Math.max(4,Math.min(13,sprite.displayWidth*.28));
        this.playerShadow.fillStyle(0x211c17,.18).fillEllipse(d.x+1,feet+1,radius*2.5,radius*.85);
        this.playerShadow.fillStyle(0x211c17,.10+.14*landed).fillEllipse(d.x,feet,radius*1.55,radius*.48);
        if (d.type==='gear' && d.value>0) {
          this.playerShadow.fillStyle(gearColors[d.value],.18).fillEllipse(d.x,feet,radius*2.2,radius*.8);
        }
        sprite.setPosition(d.x,feet-lift);
        sprite.setDepth(d.y);
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

  private effectBounds = new Map<string,{width:number;height:number}>();

  private effectScale(animation:string, scale:number) {
    let bounds=this.effectBounds.get(animation);
    if (!bounds) {
      const frames=this.anims.get(animation)?.frames;
      if (!frames?.length) return scale;
      bounds={width:Math.max(1,...frames.map(f=>f.frame.cutWidth)),height:Math.max(1,...frames.map(f=>f.frame.cutHeight))};
      this.effectBounds.set(animation,bounds);
    }
    const camera=this.cameras.main;
    return Math.min(scale,camera.width*.40/(camera.zoom*bounds.width),camera.height*.37/(camera.zoom*bounds.height));
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
    if (!this.anims.exists(animKey) || this.fxSprites.size >= 42) return;
    const fx = this.trackSprite(this.add.sprite(x, y, texture));
    fx.setOrigin(0.5, 0.5);
    fx.setDepth(depth);
    fx.setScale(this.effectScale(animKey,scale));
    fx.setFlipX(flipX);
    fx.setBlendMode(blendMode);
    fx.play(animKey);
    fx.on('animationcomplete', () => fx.destroy());
  }

  private missiles=new Map<number,Phaser.GameObjects.Sprite>();
  private flightArt:Record<FlightKind,[string,string,string,number]>={
    fireball:['fx_2001','fx_fireball_track_anim','fx_fireball_anim',.8],
    shinsu_hit:['fx_2001','fx_fireball_track_anim','fx_fireball_anim',.55],
    talisman:['fx_3002','fx_talisman_fly_anim','fx_talisman_hit_anim',1],
    ghost_fire_curse:['fx_3011','fx_curse_fly_anim','fx_curse_hit_anim',1],
    meteor:['fx_2202','fx_meteor_drop_anim','fx_meteor_boom_anim',1.2]
  };

  private syncFlights() {
    const visible=new Set<number>();
    for(const shot of game.flights){
      if(game.clock<shot.launchAt)continue;
      visible.add(shot.id);
      const [texture,animation,,scale]=this.flightArt[shot.kind];
      let sprite=this.missiles.get(shot.id);
      if(!sprite){
        sprite=this.add.sprite(shot.x,shot.y,texture).setDepth(2000).setScale(this.effectScale(animation,scale*(1+.025*(shot.level-1))));
        sprite.play(animation);this.missiles.set(shot.id,sprite);
      }
      sprite.setPosition(shot.x,shot.y-12).setRotation(Math.atan2(shot.targetY-shot.y,shot.targetX-shot.x));
    }
    for(const [id,sprite] of this.missiles)if(!visible.has(id)){sprite.destroy();this.missiles.delete(id);}
  }

  private spawnDashEffect(startX: number, startY: number, targetX: number, targetY: number, dir: number, level = 1) {
    const heroAtlas = HERO_ATLAS_MAP[this.currentHeroClass] || 'hero_5110501';
    const currentFrame = this.playerSprite.frame?.name;
    const { dirDigit, flipX } = getDirInfo(dir);

    const scaleMult = 1+.03*(level-1);

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
    streak.setScale(this.effectScale(animKey,scaleMult));
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
      lion_roar: {tex:'fx_3303',anim:'fx_lion_roar_anim',scale:1.1},
      level_up: { tex: 'level_up', anim: 'fx_level_up_anim', dy: -40, dDepth: 100, scale: 1.2 },
      lightning: { tex: 'fx_2010', anim: 'fx_lightning_anim', dy: 14, dDepth: 200, scale: 0.85 },
      hell_thunder: { tex: 'fx_2003', anim: 'fx_hell_thunder_anim', dy: -6, dDepth: 15, scale: 1.0, followPlayer: true },
      poison: { tex: 'fx_3004', anim: 'fx_poison_anim', dy: -14, dDepth: 18, scale: 1.05 },
      diamond_body: { tex: 'fx_1008', anim: 'fx_diamond_body_cast_anim', dy: -6, dDepth: 12, scale: 1.25, followPlayer: true },
      shinsu: { tex: 'fx_3007', anim: 'fx_shinsu_anim', dy: 6, dDepth: 20, scale: 1.15 },
      enhanced_skeleton: { tex: 'fx_3012', anim: 'fx_skeleton_anim', dy: 10, dDepth: 20, scale: 0.88 },
      ice_roar: { tex: 'fx_2008', anim: 'fx_ice_roar_anim', dy: 0, dDepth: 30, scale: 1.35 },
      fireball: { tex: 'fx_2001', anim: 'fx_fireball_anim', dy: -8, dDepth: 25, scale: 0.95 },
      lightning_strike: { tex: 'fx_2002', anim: 'fx_lightning_strike_anim', dy: -26, dDepth: 200, scale: 0.46 },
      heal_spell: { tex: 'fx_3001', anim: 'fx_heal_spell_anim', dy: -12, dDepth: 35, scale: 1.1, followPlayer: true },
      summon_skeleton: { tex: 'fx_3008', anim: 'fx_summon_skeleton_anim', dy: 4, dDepth: 20, scale: 1.05 },
    };

    const newEffects = game.takeEffects();
    const castPlayedThisTick = new Set<string>();


    for (const e of newEffects) {
      const lvl = e.level || 1;
      const levelMult = 1+.03*(lvl-1);

      if (e.type === 'lion_roar' && e.radius) {
        if (!this.textures.exists('roar_wave')) {
          const wave = this.textures.createCanvas('roar_wave', 128, 128);
          if (wave) {
            const ctx = wave.context;
            const glow = ctx.createRadialGradient(64, 64, 48, 64, 64, 63);
            glow.addColorStop(0, 'transparent');
            glow.addColorStop(.8, 'rgba(205,255,176,.34)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, 128, 128);
            wave.refresh();
          }
        }
        const ring = this.trackSprite(this.add.sprite(e.x,e.y,'roar_wave').setDepth(e.y + 10).setScale(.25));
        this.trackTween({targets:ring, scale:Math.min(e.radius/63,this.cameras.main.width*.40/(128*this.cameras.main.zoom)), alpha:0, duration:400, onComplete:()=>ring.destroy()});
      }

      if (e.type === 'hellfire' && e.targetX !== undefined && e.targetY !== undefined) {
        const dx = e.targetX - e.x, dy = e.targetY - e.y;
        const segments = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 52));
        for (let i = 1; i <= segments; i++) {
          const x = e.x + dx * i / segments, y = e.y + dy * i / segments;
          this.scheduleFx(i * 18, () => this.spawnSkillEffect(x, y - 8, 'fx_2007', 'fx_hellfire_anim', y + 35, .8));
        }
        continue;
      }

      if(e.type in this.flightArt) {
        const [texture,,impact,scale]=this.flightArt[e.type as FlightKind];
        if(e.impact) {
          this.spawnSkillEffect(e.x,e.y-12,texture,impact,2000,scale*levelMult);
          if(e.type==='meteor')this.spawnSkillEffect(e.x,e.y-16,'fx_2011','fx_meteor_cast_anim',2001,.85);
        } else if(e.type==='talisman' && !castPlayedThisTick.has('talisman')) {
          castPlayedThisTick.add('talisman');
          this.spawnSkillEffect(e.x,e.y+16,'fx_3002','fx_talisman_cast_anim',e.y-1,.85*levelMult);
        }
        continue;
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
        scale = Math.max(0.85, e.radius / 110);
      } else if (e.radius && e.type === 'poison') {
        scale = Math.max(0.92, e.radius / 100);
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

    const ground = this.groundFx;
    ground.clear();
    let ringCount=0;
    for (const zone of game.dangers) {
      const remaining=zone.impact-game.clock;
      const alpha=remaining<=0 ? .72 : .16+.26*Phaser.Math.Clamp(1-remaining/1.5,0,1);
      if (!zone.inner) {
        ground.fillStyle(zone.color,alpha).fillCircle(zone.x,zone.y,zone.radius);
        continue;
      }
      // A single transparent texture avoids overlapping stroke triangles and
      // radial seams on WebGL. The circular hole follows the exact hit radius.
      const key='danger-ring-'+zone.radius+'-'+zone.inner+'-'+zone.color;
      if (!this.textures.exists(key)) {
        const centre=zone.radius+1;
        const texture=this.textures.createCanvas(key,centre*2,centre*2)!;
        const ctx=texture.context;
        ctx.fillStyle='#'+zone.color.toString(16).padStart(6,'0');
        ctx.beginPath();
        ctx.arc(centre,centre,zone.radius,0,2*Math.PI);
        ctx.moveTo(centre+zone.inner,centre);
        ctx.arc(centre,centre,zone.inner,0,2*Math.PI,true);
        ctx.fill('evenodd');
        texture.refresh();
      }
      const ring=this.dangerRings[ringCount]??=this.add.image(0,0,key).setDepth(4);
      ring.setTexture(key).setPosition(zone.x,zone.y+FOOT_OFFSET).setAlpha(alpha).setVisible(true);
      ringCount++;
    }
    for(let i=ringCount;i<this.dangerRings.length;i++)this.dangerRings[i].setVisible(false);

    const fx = this.fxGraphics;
    fx.clear();
    for (const m of game.monsters) {
      const cast=m.bossCast;
      if (cast?.kind==='charge') {
        const {from,to}=cast, angle=Math.atan2(to.y-from.y,to.x-from.x);
        const nx=-Math.sin(angle)*CHARGE_RADIUS, ny=Math.cos(angle)*CHARGE_RADIUS;
        const alpha=.25+.20*Phaser.Math.Clamp(1-(cast.releaseAt-game.clock)/1.1,0,1);
        ground.fillStyle(0xe95334,alpha);
        ground.beginPath();
        ground.moveTo(from.x+nx,from.y+ny);
        ground.lineTo(to.x+nx,to.y+ny);
        ground.arc(to.x,to.y,CHARGE_RADIUS,angle+Math.PI/2,angle-Math.PI/2,true);
        ground.lineTo(from.x-nx,from.y-ny);
        ground.arc(from.x,from.y,CHARGE_RADIUS,angle-Math.PI/2,angle+Math.PI/2,true);
        ground.closePath().fillPath();
      } else if (cast?.kind==='summon') {
        const pulse=1+.15*Math.sin(game.clock*12);
        for(const p of cast.points) {
          ground.fillStyle(0xd877fb,.26).fillEllipse(p.x,p.y,52*pulse,28*pulse);
          ground.fillStyle(0xf8c5ff,.52).fillEllipse(p.x,p.y,20,9);
        }
      } else if (cast?.kind==='volley') {
        const color=missiles[bossKits[game.chapterId].missile].color;
        const charge=Phaser.Math.Clamp(1-(cast.releaseAt-game.clock)/1.05,0,1);
        const x=m.x+Math.cos(cast.angle)*13, y=m.y-12+Math.sin(cast.angle)*13;
        fx.fillStyle(color,.30).fillCircle(x,y,10+charge*11);
        fx.fillStyle(color,.95).fillCircle(x,y,5+charge*5);
        fx.fillStyle(0xfff4d6,.95).fillCircle(x,y,2+charge*3);
      }
      const kind = WOOWL_MONSTERS[m.typeId]?.missile;
      if (!kind || !m.aim) continue;
      const {windup,color} = missiles[kind];
      const charge = Phaser.Math.Clamp(1-(m.aim.releaseAt-game.clock)/windup,0,1);
      const x = m.x + m.aim.dx * 7, y = m.y - 8 + m.aim.dy * 7;
      fx.fillStyle(color,.22).fillCircle(x,y,8+charge*7);
      fx.fillStyle(color,.85).fillCircle(x,y,3+charge*4);
      fx.fillStyle(0xfff4cd,1).fillCircle(x,y,1.6+charge);
    }
    for (const shot of game.enemyShots) {
      const {color} = missiles[shot.kind];
      const x=shot.x, y=shot.y-8, {dx,dy}=shot;
      fx.fillStyle(0x261313,.32).fillEllipse(x,shot.y+6,12,5);
      fx.lineStyle(5,color,.5).lineBetween(x-dx*14,y-dy*14,x,y);
      fx.fillStyle(color,1).fillTriangle(x+dx*7,y+dy*7,
        x-dx*4-dy*5,y-dy*4+dx*5,x-dx*4+dy*5,y-dy*4-dx*5);
      fx.fillStyle(0xfff4d6,1).fillCircle(x,y,2.4);
    }

    // 2. Monster overhead health bars
    for (const m of game.monsters) {
      if (m.hp < m.maxHp || m.isElite || m.isBoss) {
        const barW = m.isBoss ? 90 : (m.isElite ? 55 : 36);
        const barH = m.isBoss ? 7 : (m.isElite ? 5 : 4);
        const bx = m.x - barW / 2;
        const sprite = this.monsterSprites.get(m.id);
        if (!sprite) continue;
        const by = sprite.y + (sprite.frame.y - sprite.displayOriginY) * sprite.scaleY - barH - 5;

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
    const screenW = cam.width/this.pixelRatio;
    const screenH = cam.height/this.pixelRatio;
    const screenCenterX = screenW / 2;
    const screenCenterY = screenH / 2;

    for (const m of game.monsters) {
      if ((m.isBoss || m.isElite) && m.hp > 0) {
        const isOffscreen = m.x < viewL || m.x > viewR || m.y < viewT || m.y > viewB;
        if (isOffscreen) {
          const worldDx = m.x - cam.worldView.centerX;
          const worldDy = m.y - cam.worldView.centerY;
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
    const frames = tex.getFrameNames().filter(f=>f.startsWith(prefix)).map(frame=>({key:atlasKey,frame}));
    if (atlasKey === 'fx_1102' && this.textures.exists('fx_1102_more')) {
      frames.push(...this.textures.get('fx_1102_more').getFrameNames().filter(f=>f.startsWith(prefix)).map(frame=>({key:'fx_1102_more',frame})));
    }
    frames.sort((a,b)=>a.frame.localeCompare(b.frame));
    // Melee hits resolve immediately. Some strips start with transparent 3×3 placeholders.
    if (prefix.includes('/attack/')) {
      const firstVisible = frames.findIndex(({key, frame}) => {
        const f = this.textures.getFrame(key, frame);
        return f.cutWidth > 3 || f.cutHeight > 3;
      });
      if (firstVisible < 0) return;
      frames.splice(0, firstVisible);
    }
    if (!frames.length) return;

    this.anims.create({
      key: animKey,
      frames,
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

    registerArmorAnimations(this,game.heroClass);

    // 2. Monster Walking Animations
    for (const atlasKey of this.textures.getTextureKeys().filter(key => key.startsWith('m_') || key.startsWith('boss_'))) {
      const id = atlasKey.slice(atlasKey.indexOf('_')+1);
      for (let dir = 0; dir <= 4; dir++) {
        this.createAnimFromAtlas(`${atlasKey}_walk_${dir}`, atlasKey, `${id}/walk/${dir}`, 8, -1);
        this.createAnimFromAtlas(`${atlasKey}_idle_${dir}`, atlasKey, `${id}/stand/${dir}`, 4, -1);
      }
    }

    for (const key of this.textures.getTextureKeys().filter(k=>k.startsWith('bossCast_'))) {
      const id=key.slice('bossCast_'.length);
      for(let dir=0;dir<=4;dir++)this.createAnimFromAtlas(key+'_attack_'+dir,key,id+'/attack/'+dir,10,0);
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
    this.createAnimFromAtlas('fx_lion_roar_anim','fx_3303','3303/casting/',16,0);
    this.createAnimFromAtlas('fx_fireball_track_anim','fx_2001','2001/track/',18,-1);
    this.createAnimFromAtlas('fx_fireball_anim', 'fx_2001', '2001/hit/', 15, 0);
    this.createAnimFromAtlas('fx_lightning_strike_anim', 'fx_2002', '2002/hit/', 16, 0);
    this.createAnimFromAtlas('fx_hellfire_anim', 'fx_2007', '2007/hit/', 15, 0);
    this.createAnimFromAtlas('fx_heal_spell_anim', 'fx_3001', '3001/hit/', 14, 0);
    this.createAnimFromAtlas('fx_summon_skeleton_anim', 'fx_3008', '3008/hit/', 14, 0);
    this.createAnimFromAtlas('fx_curse_fly_anim', 'fx_3011', '3011/track/', 14, -1);
    this.createAnimFromAtlas('fx_curse_hit_anim', 'fx_3011', '3011/hit/', 15, 0);
    this.createAnimFromAtlas('fx_hell_thunder_anim', 'fx_2003', '2003/hit/', 16, 0);
    this.createAnimFromAtlas('fx_poison_anim', 'fx_3004', '3004/hit/', 12, 0);
    this.createAnimFromAtlas('fx_poison_cast_anim', 'fx_3004', '3004/casting/', 14, 0);
    this.createAnimFromAtlas('fx_diamond_body_buff_anim', 'fx_1008', '1008/loop/', 10, -1);
    this.createAnimFromAtlas('fx_diamond_body_cast_anim', 'fx_1008', '1008/casting/', 14, 0);
    this.createAnimFromAtlas('fx_wind_shield_cast_anim', 'fx_2009', '2009/loop/', 12, -1);
    this.createAnimFromAtlas('fx_shinsu_anim', 'fx_3007', '3007/hit/', 14, 0);
    this.createAnimFromAtlas('fx_skeleton_anim', 'fx_3012', '3012/hit/', 13, 0);
    this.createAnimFromAtlas('fx_meteor_boom_anim', 'fx_2202', '2202/hit/', 16, 0);
    this.createAnimFromAtlas('fx_meteor_drop_anim', 'fx_2202', '2202/track/', 16, 0);
    this.createAnimFromAtlas('fx_meteor_cast_anim', 'fx_2011', '2011/casting/', 14, 0);
    this.createAnimFromAtlas('fx_talisman_fly_anim', 'fx_3002', '3002/track/', 14, -1);
    this.createAnimFromAtlas('fx_talisman_hit_anim', 'fx_3002', '3002/hit/', 15, 0);
    this.createAnimFromAtlas('fx_talisman_cast_anim', 'fx_3002', '3002/casting/', 14, 0);
  }
}

export function bootField(onProgress:(value:number)=>void,onReady:()=>void,onError:()=>void) {
  const host=document.getElementById('world')!;
  const backingSize=()=>{
    const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight);
    const density=Math.max(1,Math.min(devicePixelRatio || 1,2,Math.sqrt(1800000/(w*h))));
    return {width:Math.round(w*density),height:Math.round(h*density)};
  };
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'world',
    backgroundColor: '#0c0f12',
    pixelArt: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.FIT,
      ...backingSize()
    },
    scene: [BattleScene],
    audio: { noAudio: true },
    fps: { target: 60 }
  };

  return new Phaser.Game({...config, callbacks:{preBoot(engine){
    engine.events.once('ready',()=>{
      const observer=new ResizeObserver(()=>{
        const {width,height}=backingSize();
        if(engine.scale.width!==width || engine.scale.height!==height) engine.scale.setGameSize(width,height);
      });
      observer.observe(host);
      engine.events.once('destroy',()=>observer.disconnect());
    });
    engine.events.on('field-progress',onProgress);
    engine.events.once('field-ready',onReady);
    engine.events.once('field-error',onError);
  }}});
}
