import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';

const app = express();

app.use(cors());

const getMe = async req => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (error) {
      throw new AuthenticationError('Your session expired. Sign in again!')
    }
  }
};

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  formatError: error => {
    // remove the internal sequelize error message
    // leave only the important validation error
    const message = error.message.replace('SequelizeValidationError: ', '').replace('Validation error: ', '');
    
    return {
      ...error,
      message,
    };
  },
  context: async ({ req, connection }) => {
    if (connection) {
      return { models };
    }

    if (req) {
      const me = await getMe(req);
  
      return {
        models,
        me,
        secret: process.env.SECRET,
      }
    }
  },
});

server.applyMiddleware({ app, path: '/graphql' });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const eraseDatabaseOnSync = true;

sequelize.sync({ force: eraseDatabaseOnSync }).then(async () => {
  if (eraseDatabaseOnSync) {
    createUsersWithMessages(new Date());
  }

  httpServer.listen({ port: 8000 }, () => {
    console.log('🚀 Apollo Server on http://localhost:8000/graphql');
  });
});

const createUsersWithMessages = async date => {
  await models.User.create(
    {
      username: 'forgna',
      email: 'hello@forgna.com',
      password: '1234567',
      role: 'ADMIN',
      messages: [
        { 
          text: 'Hello Node, GraphQL, Apollo, and Postgres!',
          createdAt: date.setSeconds(date.getSeconds() + 1), 
        },
      ],
    },
    {
      include: [models.Message],
    }
  );

  await models.User.create(
    {
      username: 'ddavids',
      email: 'hello@ddavids.com',
      password: 'ddavids',
      messages: [
        { 
          text: 'Happy to learn ...',
          createdAt: date.setSeconds(date.getSeconds() + 1),
        }, 
        { 
          text: 'Published a complete ...',
          createdAt: date.setSeconds(date.getSeconds() + 1), 
        },
      ], 
    },
    {
      include: [models.Message],
    },
  );

};
