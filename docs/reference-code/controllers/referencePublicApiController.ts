import { ILogWriter, JsonUtil, PublicController } from 'backend-core';
import { Router } from 'express';

// Minimal reference service to illustrate usage; replace with your real service
interface ExamplePublicService<T = any> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(item: T): Promise<T>;
}

interface ReferencePublicApiControllerProps<T = any> {
  baseUrl: string;
  jsonUtil: JsonUtil;
  logWriter: ILogWriter;
  exampleService?: ExamplePublicService<T>;
}

// Reference "public" controller showcasing the common pattern
export class ReferencePublicApiController<T = any> extends PublicController {
  constructor(private readonly props: ReferencePublicApiControllerProps<T>) {
    super(props.baseUrl, props.logWriter);
  }

  public initialize(): Router {
    this.props.logWriter.info('Initializing Reference Public API');

    // GET collection (200)
    this.addGet('/reference/items', async (_req, res) => {
      await this.performRequest(
        () => this.props.exampleService?.getAll() ?? Promise.resolve([]),
        res
      );
    });

    // GET by id (200/404)
    this.addGet('/reference/items/:id', async (req, res) => {
      const { id } = req.params;

      await this.performRequest(
        () => this.props.exampleService?.getById(id) ?? Promise.resolve(undefined),
        res,
        (result) => (result !== undefined ? 200 : 404)
      );
    });

    // POST create (201)
    this.addPost('/reference/items', async (req, res) => {
      const item = this.props.jsonUtil.getParsedRequestBody<T>(req.body);

      await this.performRequest(
        () => this.props.exampleService?.create(item) ?? Promise.resolve(item as T),
        res,
        // Return 201 Created on success
        () => 201
      );
    });

    return this.router;
  }
}

