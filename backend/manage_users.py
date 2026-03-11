"""Utility script for user management (create admin, hash password).

Usage examples:

  # create admin user
  python manage_users.py create --email admin@x.com --password secret --first Admin --last User 

  # just print bcrypt hash for a password
  python manage_users.py hash --password secret
"""
import argparse
import bcrypt

# import helper from app
from backend.app import query


def create_user(email, password, first_name="", last_name="", role="admin"):
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    row = query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role)"
        " VALUES (%s,%s,%s,%s,%s) RETURNING id",
        (email, pw_hash, first_name, last_name, role),
        fetchone=True,
        commit=True,
    )
    return row


def print_hash(password):
    print(bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode())


def main():
    parser = argparse.ArgumentParser(description="Manage users in the KylianShop database")
    sub = parser.add_subparsers(dest="cmd")

    hsh = sub.add_parser("hash", help="output bcrypt hash for a given password")
    hsh.add_argument("--password", required=True, help="password to hash")

    create = sub.add_parser("create", help="create a new user")
    create.add_argument("--email", required=True)
    create.add_argument("--password", required=True)
    create.add_argument("--first", default="")
    create.add_argument("--last", default="")
    create.add_argument("--role", default="admin", choices=["admin","customer"])

    args = parser.parse_args()
    if args.cmd == "hash":
        print_hash(args.password)
    elif args.cmd == "create":
        row = create_user(args.email, args.password, args.first, args.last, args.role)
        print(f"created user id {row['id']} role {args.role}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
