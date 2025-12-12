FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# ВАЖНО: копируем сгенерированного Prisma Client
COPY prisma ./prisma
COPY node_modules/.prisma ./node_modules/.prisma
COPY node_modules/@prisma ./node_modules/@prisma

COPY . .

CMD ["npm", "run", "start:dev"]


