const { endpoint } = require("@octokit/endpoint");
const umiRequest = require("umi-request").default;
const { encode: base64_encode, decode: base64_decode } = require("js-base64");

exports.GithubApi = class GithubApi {
  constructor(config) {
    this.config = config || {
      user: "bibidu",
      repositoryName: "marx-gh-cache",
    };

    this.ensureAccessTokenExist();
  }

  ensureAccessTokenExist() {
    if (!this.config.access_token) {
      throw new Error("Please pass access_token of github!");
    }
  }

  get headers() {
    return {
      authorization: `token ${this.config.access_token}`,
    };
  }

  withAuthHeaders(options) {
    const headers = options.headers || {};
    return {
      ...options,
      headers: {
        ...headers,
        ...this.headers,
      },
    };
  }

  logError(error) {
    if (error && error.data) {
      const { message, errors } = error.data;
      console.log(
        [
          "<< ======================== >>",
          "[GithubApi Error]",
          message,
          ...(errors || []).map(({ resource, message, field }) =>
            [
              `  -{Error Reason}: ${resource}`,
              `  -{Error Message}: ${message}`,
              `  -{Error Field}: ${field}`,
            ].join("\n")
          ),
        ].join("\n")
      );
    }
  }

  umiRequest(options) {
    const { url, ...params } = this.withAuthHeaders(options);
    return umiRequest(url, params);
  }

  getDescription(type, content) {
    switch (type) {
      case "createRepository":
        return "Created by GhApi.";
      case "updateContent":
        return `Updated '${content}' by GhApi.`;
    }
  }

  async requestSha(appointFile) {
    const options = endpoint("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
      owner: this.config.user,
      repo: this.config.repositoryName,
      tree_sha: "HEAD",
    });
    try {
      const res = await this.umiRequest(options);
      const backup_file = res.tree.filter((item) => {
        return item.path === appointFile;
      })[0];
      return backup_file.sha;
    } catch (error) {
      this.logError(error);
    }
  }

  async createRepository(name) {
    const options = endpoint("POST /user/repos", {
      data: JSON.stringify({
        name: name || this.config.repositoryName,
        private: true,
        description: this.getDescription("createRepository"),
      }),
    });
    try {
      const res = await this.umiRequest(options);
      console.log("createReposition success!");
    } catch (error) {
      this.logError(error);
    }
  }

  async updateContent({ file = "dxz.backup.json", content } = {}) {
    const file_sha = await this.requestSha(file);
    const params = {
      message: this.getDescription("updateContent", file),
      content: base64_encode(content),
    };
    if (file_sha) params.sha = file_sha;

    const options = endpoint("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: this.config.user,
      repo: this.config.repositoryName,
      path: file,

      data: JSON.stringify(params),
    });
    try {
      await this.umiRequest(options);
      console.log("updateContent success!");
    } catch (error) {
      this.logError(error);
    }
  }

  async getContent({ file = "dxz.backup.json" } = {}) {
    const file_sha = await this.requestSha(file);
    const options = endpoint("GET /repos/{owner}/{repo}/git/blobs/{file_sha}", {
      owner: this.config.user,
      repo: this.config.repositoryName,
      file_sha,
    });
    try {
      const res = await this.umiRequest(options);
      console.log("getContent success!");
      const result = base64_decode(res.content);
      return result;
    } catch (error) {
      this.logError(error);
    }
  }
};
