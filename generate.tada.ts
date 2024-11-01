import { generateSchema } from '@gql.tada/cli-utils';

generateSchema({
  input: 'https://tm-lambda.azurewebsites.net/api/graphql',
  output: './src/tm-lambda.graphql',
  headers: undefined,
  tsconfig: undefined,
});

generateSchema({
    input: 'https://sofascore-lambda.azurewebsites.net/api/graphql', // TODO: set the default schema from global parameters
    output: './src/sofascore-lambda.graphql',
    headers: undefined,
    tsconfig: undefined,
  });