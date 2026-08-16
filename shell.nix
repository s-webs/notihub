{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "notification-hub-dev";

  buildInputs = with pkgs; [
    nodejs_22
    pnpm
    postgresql_16
    redis
    openssl
    prisma-engines
    jq
    git
  ];

  # Дефолты совпадают с Infra (infra-postgres-1 / infra-redis-1).
  # Секреты и оверрайды — в .env (подхватывается direnv через dotenv_if_exists).
  DATABASE_URL = "postgresql://postgres:secret@localhost:5432/notification_hub?schema=public";
  REDIS_URL = "redis://localhost:6379";
  PORT = "3040";

  shellHook = ''
    export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
    export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

    echo "Notification Hub dev shell"
    echo "Node: $(node -v) | pnpm: $(pnpm -v)"
    echo "Prisma schema-engine: $PRISMA_SCHEMA_ENGINE_BINARY"
    echo ""
    echo "Postgres/Redis: Infra (localhost:5432 / :6379) или docker compose up -d"
    echo "  psql \"\$DATABASE_URL\" -c 'select 1;'"
    echo "  redis-cli -u \"\$REDIS_URL\" ping"
    echo ""
    echo "Первый запуск:"
    echo "  pnpm install"
    echo "  pnpm prisma migrate dev"
    echo "  pnpm start:dev"
  '';
}
