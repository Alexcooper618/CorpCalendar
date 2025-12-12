FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["sh", "-c", "npx prisma generate && npm run start:dev"]
