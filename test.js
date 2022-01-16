const { GithubApi } = require(".");

const repositoryName = "";
const access_token = "";

(async () => {
  const api = new GithubApi({
    user: "bibidu",
    repositoryName,
    access_token,
  });
  await api.createRepository();

  const file = "dxz.demo.txt";
  await api.updateContent({
    file,
    content: "Hello World! 😄",
  });

  await api.getContent({ file });
})();
