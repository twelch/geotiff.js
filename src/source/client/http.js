import { BaseClient, BaseResponse } from './base';


class HttpResponse extends BaseResponse {
  /**
   * BaseResponse facade for node HTTP/HTTPS API Response
   * @param {http.ServerResponse} response
   */
  constructor(response, dataPromise) {
    super();
    this.response = response;
    this.dataPromise = dataPromise;
  }

  get status() {
    return this.response.statusCode;
  }

  getHeader(name) {
    return this.response.headers[name];
  }

  async getData() {
    const data = await this.dataPromise;
    return data;
  }
}

export class HttpClient extends BaseClient {
  constructor(url) {
    super(url);
    this.parsedUrl = urlMod.parse(this.url);
    this.httpApi = (this.parsedUrl.protocol === 'http:' ? http : https);
  }
  constructRequest(headers, signal) {
    return new Promise((resolve, reject) => {
      const request = this.httpApi.get(
        {
          ...this.parsedUrl,
          headers,
        },
        (response) => {
          const contentRange = parseContentRange(response.headers['content-range']);
          if (contentRange !== null) {
            this._fileSize = contentRange.length;
          }

          const dataPromise = new Promise((resolve) => {
            const chunks = [];

            // collect chunks
            response.on('data', (chunk) => {
              chunks.push(chunk);
            });

            // concatenate all chunks and resolve the promise with the resulting buffer
            response.on('end', () => {
              const data = Buffer.concat(chunks).buffer;
              resolve(data);
            });
            response.on('error', reject);
          });
          resolve(new HttpResponse(response, dataPromise));
        },
      );
      request.on('error', reject);

      if (signal) {
        signal.addEventListener('abort', () => request.destroy(new Error('Request aborted')));
      }
    });
  }
  async request({ headers, signal } = {}) {
    const response = await this.constructRequest(headers, signal);
    return response;
  }
}
