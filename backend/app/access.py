"""Access level, worked out fresh on every request and every incoming message (docs/BACKEND.md 7.2).

    suspended   user.status = 'suspended'
    full        user.status = 'active' AND a subscription is 'active' or 'past_due' AND now() < access_until
    limited     everything else (registered but unpaid, lapsed, refunded)

    access_until = greatest(current_period_end, grace_until, extended_until)

Nothing stores "subscription ended": the level is computed from dates, so it cannot go stale.
"""
from . import db


def access_for(user_id: int) -> dict:
    user = db.one("select status from users where id = %s", (user_id,))
    sub = db.one(
        """
        select s.*, p.name as plan_name,
               greatest(s.current_period_end, s.grace_until, s.extended_until) as access_until,
               now() < greatest(s.current_period_end, s.grace_until, s.extended_until) as in_time
        from subscriptions s join plans p on p.code = s.plan_code
        where s.user_id = %s and s.status in ('active', 'past_due')
        order by access_until desc limit 1
        """,
        (user_id,),
    )
    if not user:
        level = "limited"
    elif user["status"] == "suspended":
        level = "suspended"
    elif sub and sub["in_time"]:
        level = "full"
    else:
        level = "limited"
    return {
        "level": level,
        "plan": sub["plan_code"] if sub else None,
        "plan_name": sub["plan_name"] if sub else None,
        "subscription_status": sub["status"] if sub else None,
        "access_until": sub["access_until"].isoformat() if sub else None,
    }
