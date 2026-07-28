import type { Fragment } from "../types/index.js";

export class StorageNodeClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public getUrl(): string {
    return this.url;
  }

  async storeFragment(fragment: Fragment): Promise<void> {
    const dataBuffer = Buffer.isBuffer(fragment.data)
      ? fragment.data
      : Buffer.from(fragment.data);

    const body = dataBuffer.buffer.slice(
      dataBuffer.byteOffset,
      dataBuffer.byteOffset + dataBuffer.byteLength,
    ) as ArrayBuffer;

    const response = await fetch(`${this.url}/fragment/${fragment.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": dataBuffer.length.toString(),
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to store fragment ${fragment.id}`);
    }
  }

  async retrieveFragment(fragmentId: string): Promise<Buffer> {
    const response = await fetch(`${this.url}/fragment/${fragmentId}`);

    if (response.status === 404) {
      throw new Error(`404: Fragment not found`);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to retrieve fragment ${fragmentId} (Status: ${response.status})`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  waitForConnection(): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): void {}
}
