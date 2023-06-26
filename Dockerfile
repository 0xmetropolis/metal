FROM node:16-alpine as ts-environment
WORKDIR /usr/app

COPY package.json ./

COPY yarn-lock.json ./
COPY tsconfig*.json ./

RUN yarn

COPY . ./

RUN yarn build

ENV NODE_ENV=production
ENV CORS_ORIGIN=*
ENV PORT=3000
EXPOSE 3000/tcp

CMD ["node", "dist/src/index.js"]