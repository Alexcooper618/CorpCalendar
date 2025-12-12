FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

# generate Prisma Client inside the image
COPY prisma ./prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npx prisma generate

COPY . .

CMD ["npm", "run", "start:dev"]
