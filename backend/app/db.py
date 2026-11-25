"""PostgreSQL access: one connection pool, small helpers, and the schema applied at start-up."""
from pathlib import Path
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from . import config

pool = ConnectionPool(config.DATABASE_URL, kwargs={"row_factory": dict_row}, open=False, min_size=1, max_size=10)

PLANS = [
    ("jobsq_ai", "JobsQ AI", "We run the AI for you. Nothing to install. Price not decided yet.", None),
    ("own_ai", "Your own AI", "Cheaper: the agents run on your own Claude Code or Codex subscription, through the JobsQ Connector "
                              "on your computer. Your computer must be on while the agents work. Price not decided yet.", None),
]
OLD_PLANS = {"classic": "jobsq_ai", "own_key": "own_ai"}  # earlier plan codes, moved to the new ones


def init() -> None:
    global pool
    if pool.closed:  # a closed pool can't be reopened (happens when the app restarts in tests)
        pool = ConnectionPool(config.DATABASE_URL, kwargs={"row_factory": dict_row}, open=False, min_size=1, max_size=10)
    pool.open(wait=True)
    with pool.connection() as c:
        c.execute(Path(__file__).with_name("schema.sql").read_text())
        for code, name, desc, price in PLANS:
            c.execute(
                "insert into plans (code, name, description, price_inr) values (%s, %s, %s, %s) "
                "on conflict (code) do update set name = excluded.name, description = excluded.description",
                (code, name, desc, price),
            )
        for old, new in OLD_PLANS.items():
            c.execute("update subscriptions set plan_code = %s where plan_code = %s", (new, old))
            c.execute("delete from plans where code = %s", (old,))


def all_rows(sql: str, params: tuple | dict = ()) -> list[dict]:
    with pool.connection() as c:
        return c.execute(sql, params).fetchall()


def one(sql: str, params: tuple | dict = ()) -> dict | None:
    with pool.connection() as c:
        return c.execute(sql, params).fetchone()


def run(sql: str, params: tuple | dict = ()) -> None:
    with pool.connection() as c:
        c.execute(sql, params)
