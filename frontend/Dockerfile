# Используем официальный образ Next.js (он включает всё нужное)
FROM node:20-bullseye

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Генерируем стили Tailwind и строим Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

