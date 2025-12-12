FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

# generate Prisma Client inside the image
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

CMD ["npm", "run", "start:dev"]
