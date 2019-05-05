FROM skyerus/environments:node-alpine

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
