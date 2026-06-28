export interface ServiceContext {
  actorId?: string;
  requestId?: string;
}

export interface ServiceModule {
  readonly name: string;
}
