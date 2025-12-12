FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# generate Prisma Client inside the image
COPY prisma ./prisma
RUN apk add --no-cache ca-certificates openssl \
  && update-ca-certificates \
  && npx prisma generate

COPY . .

CMD ["npm", "run", "start:dev"]
