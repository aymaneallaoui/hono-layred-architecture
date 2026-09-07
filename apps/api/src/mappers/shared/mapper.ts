export interface Mapper<Row, Domain> {
  toDomain(row: Row): Domain
  toDomainList(rows: readonly Row[]): Domain[]
}
