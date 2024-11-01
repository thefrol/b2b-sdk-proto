import { initGraphQLTada } from "gql.tada"
import * as sofascoreTada from "./sofascore_lambda-env"
import * as tmTada from "./tm_lambda-env"



export const tm = initGraphQLTada<{
    introspection: tmTada.introspection
}>()

export const sofascore = initGraphQLTada<{
    introspection: sofascoreTada.introspection
}>()

