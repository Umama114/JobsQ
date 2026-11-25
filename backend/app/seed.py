"""Adds one ready-to-use account: email confirmed, an active test plan, and its WhatsApp number already linked.

Reads SEED_NAME, SEED_EMAIL, SEED_PASSWORD, SEED_PHONE (digits with country code) from .env.
Run:  docker compose exec api python -m app.seed
"""
import os
from . import db
from .security import digits, hash_password


def main() -> None:
    name, email, password, phone = (os.environ.get(k, "") for k in ("SEED_NAME", "SEED_EMAIL", "SEED_PASSWORD", "SEED_PHONE"))
    phone = digits(phone)
    if not (name and email and len(password) >= 8 and 10 <= len(phone) <= 15):
        raise SystemExit("Set SEED_NAME, SEED_EMAIL, SEED_PASSWORD (8+ characters) and SEED_PHONE in .env first.")
    db.init()
    email = email.strip().lower()
    if db.one("select 1 from users where phone = %s and email <> %s", (phone, email)):
        raise SystemExit("SEED_PHONE is already used by another account.")
    user = db.one("select id from users where email = %s", (email,))
    if user:
        db.run("update users set name = %s, phone = %s, password_hash = %s, status = 'active', email_verified_at = coalesce(email_verified_at, now()) where id = %s",
               (name, phone, hash_password(password), user["id"]))
    else:
        user = db.one("insert into users (email, name, phone, password_hash, email_verified_at) values (%s, %s, %s, %s, now()) returning id",
                      (email, name, phone, hash_password(password)))
    uid = user["id"]
    db.run("update subscriptions set status = 'canceled' where user_id = %s and status in ('active', 'past_due')", (uid,))
    db.run("insert into subscriptions (user_id, plan_code, status, current_period_end, provider) values (%s, 'jobsq_ai', 'active', now() + interval '30 days', 'test')", (uid,))
    db.run("update channel_links set status = 'disconnected' where (user_id = %s or (channel = 'whatsapp' and external_id = %s)) and status <> 'disconnected'", (uid, phone))
    db.run("insert into channel_links (user_id, channel, external_id, status) values (%s, 'whatsapp', %s, 'active')", (uid, phone))
    print(f"Ready: {email} (user {uid}), JobsQ AI plan active for 30 days, WhatsApp ...{phone[-4:]} linked.")


if __name__ == "__main__":
    main()
