import * as sprites from "./sprites.json";
import * as fx from "./fx";
import { Damage, Death, GameObject } from "./game";
import { clamp, randomFloat, randomInt, vectorFromAngle } from "./helpers";
import { Chariot, Corpse, Spell, Skeleton, SkeletonLord } from "./objects";
import { CORPSE, LIVING, MOBILE } from "./tags";

export function Damage(
  object: GameObject,
  amount: number,
  dealer?: GameObject,
) {
  let damage: Damage = { amount, dealer };
  object.onDamage(damage);
  object.hp = clamp(object.hp - damage.amount, 0, object.maxHp);
  if (!object.hp) Die(object);
}

export function Die(object: GameObject) {
  let death: Death = {
    object,
    souls: object.souls,
  };

  game.despawn(object);

  if (object.is(MOBILE)) {
    let center = object.center();

    fx
      .bones()
      .extend(center)
      .burst(2 + randomInt(3))
      .remove();

    if (object.is(LIVING) && randomFloat() > 0.75) {
      game.spawn(Corpse(center.x, center.y));
    }

    for (let ritual of game.rituals) {
      ritual.onDeath?.(death);
    }

    game.souls += death.souls;
  }
}

let castAnimationTimeout = 0;

export function Cast() {
  let { spell, player } = game;

  if (spell.casts === 0) return;
  spell.casts -= 1;

  let power = spell.basePower + game.getCastingEnergy() * 100;

  player.sprite = sprites.norman_arms_up;
  clearTimeout(castAnimationTimeout);
  castAnimationTimeout = setTimeout(() => player.sprite = sprites.norman_arms_down, 500);
  let targetAngle = spell.targetAngle - (spell.shotsPerRound * spell.shotOffsetAngle / 2);

  for (let j = 0; j < spell.shotsPerRound; j++) {
    let projectile = Spell();
    let angle = targetAngle + j * spell.shotOffsetAngle;
    let [vx, vy] = vectorFromAngle(angle);
    let { x, y } = game.getCastingPoint();
    projectile.x = x - projectile.sprite[2] / 2;
    projectile.y = y - projectile.sprite[3] / 2;
    projectile.vx = vx * power;
    projectile.vy = vy * power;
    game.spawn(projectile);
    game.onCast(projectile);
  }

  spell.castStartTime = Infinity;
}

export function Resurrect() {
  if (game.ability.timer > 0) {
    return;
  }

  game.ability.timer = game.ability.cooldown;

  for (let ritual of game.rituals) {
    ritual.onResurrect?.();
  }

  for (let object of game.objects) {
    if (object.is(CORPSE)) {
      game.despawn(object);
      let unit = Skeleton(object.x, 0);
      fx.cloud(unit.bounds(), [
        [sprites.p_green_1, sprites.p_green_2, sprites.p_green_3],
        [sprites.p_green_2, sprites.p_green_3, sprites.p_green_4],
        [sprites.p_green_1, sprites.p_green_3, sprites.p_green_5],
      ]).burst(10).remove();
      game.spawn(unit);
    }
  }
}