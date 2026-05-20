FROM node:20-alpine AS base

# Krok 1: Instalacja zależności
FROM base AS deps
# Pakiet libc6-compat jest często potrzebny w Alpine Linux
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Skopiuj pliki z zależnościami. Zależnie od używanego menedżera pakietów, 
# zostanie uruchomiona odpowiednia komenda instalacyjna.
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Krok 2: Budowanie aplikacji
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Opcjonalne: wyłączenie telemetrii Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Dostarczamy fałszywą zmienną DATABASE_URL a także DIRECT_URL, aby Prisma mogła wygenerować klienta podczas budowania.
# Zostaną one zastąpione prawdziwymi sekretami z Supabase w środowisku uruchomieniowym Cloud Run.
ENV DATABASE_URL="postgresql://postgres:password@db.xtdxxxxxxxxxx.supabase.co:5432/postgres"
ENV DIRECT_URL="postgresql://postgres:password@db.xtdxxxxxxxxxx.supabase.co:5432/postgres"

# Klucze publiczne Supabase (muszą być dostępne podczas budowania dla Next.js)
ENV NEXT_PUBLIC_SUPABASE_URL="https://yizkaxynfwexfjgfksbg.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ubW-pvdc3e81q_Glv1avSw_64xAFQHV"

RUN npm run build

# Krok 3: Obraz produkcyjny (zawiera tylko niezbędne pliki)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Skopiuj wygenerowane pliki trybu standalone i pliki statyczne
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Google Cloud Run automatycznie wstrzykuje zmienną środowiskową PORT (domyślnie 8080)
ENV PORT 8080
EXPOSE 8080

CMD ["node", "server.js"]