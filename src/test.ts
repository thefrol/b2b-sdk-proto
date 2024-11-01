import { initGraphQLTada } from 'gql.tada';
import type { introspection } from './sofascore-env';

export const sofascore = initGraphQLTada<{
  introspection: introspection;
}>();

export type { FragmentOf, ResultOf, VariablesOf } from 'gql.tada';
export { readFragment } from 'gql.tada';

sofascore(`#graphql
    123
    query{
        12312
    }
    `)