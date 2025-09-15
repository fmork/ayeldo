import type { HttpRouter, ILogWriter, JsonUtil } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';

// Minimal reference service to illustrate usage; replace with your real service
export interface ExamplePublicService<T = unknown> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(item: T): Promise<T>;
}

export interface ReferencePublicApiControllerProps<T = unknown> {
  baseUrl: string;
  jsonUtil: JsonUtil;
  logWriter: ILogWriter;
  exampleService?: ExamplePublicService<T>;
  // Optional zod schema for POST /reference/items body
  createSchema?: z.ZodType<T>;
}

// Reference "public" controller showcasing the common pattern
export class ReferencePublicApiController<T = unknown> extends PublicController {
  private readonly props: ReferencePublicApiControllerProps<T>;

  constructor(props: ReferencePublicApiControllerProps<T>) {
    super(props.baseUrl, props.logWriter);
    this.props = props;
  }

  public initialize(): HttpRouter {
    this.props.logWriter.info('Initializing Reference Public API');

    // GET collection (200)
    this.addGet('/reference/items', async (_req, res) => {
      await this.performRequest(
        () => this.props.exampleService?.getAll() ?? Promise.resolve([] as T[]),
        res,
      );
    });

    // GET by id (200/404) — validate id param
    this.addGet('/reference/items/:id', async (req, res) => {
      const id = z
        .string()
        .min(1)
        .parse((req as unknown as { params: { id: unknown } }).params.id);

      await this.performRequest(
        () => this.props.exampleService?.getById(id) ?? Promise.resolve(undefined),
        res,
        (result) => (result !== undefined ? 200 : 404),
      );
    });

    // POST create (201) — validate body
    this.addPost('/reference/items', async (req, res) => {
      const raw = (req as unknown as { body: unknown }).body;
      const item: T = this.props.createSchema
        ? this.props.createSchema.parse(raw)
        : this.props.jsonUtil.getParsedRequestBody<T>(raw);

      await this.performRequest(
        () => this.props.exampleService?.create(item) ?? Promise.resolve(item as T),
        res,
        // Return 201 Created on success
        () => 201,
      );
    });

    return this.getRouter();
  }
}
