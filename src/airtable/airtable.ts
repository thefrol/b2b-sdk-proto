import Airtable, { FieldSet } from'airtable'

export type TableParams ={
    base: string,
    table: string, 
    apiKey: string
}



export class Table<T extends FieldSet> {
    api: Airtable.Table<Partial<T>>
    constructor(params: TableParams){
        this.api =  new Airtable({apiKey: params.apiKey})
            .base(params.base)
            .table(params.table)
    }

    async all(){
        return await this.api.select().all()
    }
}
