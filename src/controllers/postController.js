import connection from "../databases/postgres.js";
import urlMetadata from "url-metadata";
import { postRepository } from "../repository/postsRepositoy.js";

export async function createPost(req, res) {
  try {
    const verifiedUser = res.locals.user;
    console.log(verifiedUser);

    const id = verifiedUser.id;
    console.log("userId: " + id);

    let { url, comment } = req.body;
    console.log(id, url, comment);
    if (comment === undefined) {
      comment = "";
    }

    const metaDados = await urlMetadata(url);

    // insert new post
    const newPost = await postRepository.insertNewPost(
      id,
      comment,
      url,
      metaDados
    );

    const { rows: searchPostId } = await postRepository.searchPost(url);

    const hashtags = comment.split("#");
    const qtdHashtags = comment.split("#").length - 1;
    for (let i = 1; i <= qtdHashtags; i++) {
      let tag = hashtags[hashtags.length - i];
      let newHashtag = await postRepository.insertHashtag(tag, searchPostId);
      console.log(tag);
    }

    return res.status(200).send("Novo post e hashtag adicionados");
  } catch (erro) {
    console.log(erro);
    return res.status(500).send("erro");
  }
}

export async function getPosts(req, res) {
  try {
    const index = parseInt(req.query.index);
    const verifiedUser = res.locals.user;

    const id = verifiedUser.id;

    let posts = [];

    if (index > 10) {
      posts = await connection.query(
        `select users.id, posts.id AS "postId", posts."userId", users.name, users.image AS profile,
    posts.comment, posts.url, posts.title, posts.image, posts.description, count(likes."postId") as "likesCount"  
        FROM posts INNER JOIN users on posts."userId" = users.id 
        left join likes on posts.id = likes."postId"
        
      join followers ON followers."profileId" = users.id
      where followers.follower = $1
        group by posts.id, users.id
        order by posts.id
        desc limit $2;`,
        [id, index + 4]
      );
    } else {
      posts = await connection.query(
        `select users.id, posts.id AS "postId", posts."userId", users.name, users.image AS profile,
    posts.comment, posts.url, posts.title, posts.image, posts.description, count(likes."postId") as "likesCount",
    count(repost."postId") as "repostCount" 
        FROM posts INNER JOIN users on posts."userId" = users.id 
        left join likes on posts.id = likes."postId"
        
      join followers ON followers."profileId" = users.id
      left join repost on repost."postId" = posts.id
      where followers.follower = $1
        group by posts.id, users.id
        order by posts.id
        desc limit 10;`,
        [id]
      );
    }
    const postsRows = posts.rows;

    const postsId = postsRows.map((post) => post.postId);

    const { rows: postsLikes } = await connection.query(
      `select likes.*, users.name from likes inner join users ON likes."userId" = users.id where "postId" = ANY($1::int[])`,
      [postsId]
    );

    const { rows: commentsCount } = await connection.query(`select "postId", count(id) from comments where "postId" = ANY($1::int[]) group by "postId"`, [postsId]);

    let joinPostsLikes = [...postsRows];

    for (let i = 0; i < joinPostsLikes.length; i++) {
      joinPostsLikes[i].likes = [];
      joinPostsLikes[i].commentsCount = 0;
      postsLikes.map((like) => {
        if (like.postId === joinPostsLikes[i].postId) {
          joinPostsLikes[i].likes.push({
            id: like.id,
            userId: like.userId,
            postId: like.postId,
            name: like.name,
          });
        }
      });
      commentsCount.map(post => {
        if(post.postId === joinPostsLikes[i].postId){
            joinPostsLikes[i].commentsCount = post.count;
        }
      });
    }

    //console.log(joinPostsLikes);
    res.send(joinPostsLikes);

    //const {rows: posts} = await postRepository.listPosts()
  } catch (erro) {
    console.log(erro);
    return res.status(500).send("erro");
  }
}

export async function deletepost(req, res) {
  try {
    const { postId } = req.params;
    const verifiedUser = res.locals.user;
    //console.log(verifiedUser);

    const id = verifiedUser.id;

    const { rows: searchIdPost } = await postRepository.searchPostId(postId);

    if (searchIdPost.length === 0) {
      return res.sendStatus(404);
    }

    if (searchIdPost[0].userId !== id) {
      return res.status(401).send("O post não pertence a esse usuário");
    }

    const deletlikes = await postRepository.deletingLikes(postId);

    if (searchIdPost[0].userId === id) {
      const deletingHashtags = await postRepository.deletingHashtags(postId);

      const deletingUrl = await postRepository.deletingPost(postId);
      return res.status(204).send("Post deletado");
    }
  } catch (erro) {
    console.log(erro);
    return res.status(500).send("erro");
  }
}

export async function updatePosts(req, res) {
  const { updateComment, url } = req.body;
  const verifiedUser = res.locals.user;
  if (updateComment === undefined) {
    updateComment = "";
  }
  const userId = verifiedUser.id;
  const { rows: searchPostId } = await postRepository.searchPost(url);

  if (searchPostId.length === 0) {
    return res.sendStatus(404);
  }
  let postId = searchPostId[0].id;

  console.log(postId);
  // apagar todas as hashtags desse post
  const deleteHashtags = await postRepository.deletingHashtags(postId);

  //Atualizar a tabela de hashtags caso haja hashtags nesse novo comentário
  const hashtags = updateComment.split("#");
  const qtdHashtags = updateComment.split("#").length - 1;
  for (let i = 1; i <= qtdHashtags; i++) {
    let tag = hashtags[hashtags.length - i];
    let newHashtag = await postRepository.insertHashtag(tag, searchPostId);
    console.log(tag);
  }

  //inserir novo post
  const update = await postRepository.updatingPost(updateComment, postId);

  return res.status(200).send("Comentário atualizado");
}

export async function getposts2(req, res) {
  const { offset } = req.params;

  try {
    const { rows: posts } = await connection.query(
      `select users.id, posts.id AS "postId", posts."userId", users.name, users.image AS profile, posts.comment , posts.url, posts.title, posts.image, posts.description, count(likes."postId") as "likesCount" from posts inner join users on posts."userId" = users.id left join likes on posts.id = likes."postId" group by posts.id, users.id order by posts.id desc limit 10 OFFSET $1`,
      [offset]
    );

    const postsId = posts.map((post) => post.postId);

    const { rows: postsLikes } = await connection.query(
      `select likes.*, users.name from likes inner join users ON likes."userId" = users.id where "postId" = ANY($1::int[])`,
      [postsId]
    );

    let joinPostsLikes = [...posts];

    for (let i = 0; i < joinPostsLikes.length; i++) {
      joinPostsLikes[i].likes = [];
      postsLikes.map((like) => {
        if (like.postId === joinPostsLikes[i].postId) {
          joinPostsLikes[i].likes.push({
            id: like.id,
            userId: like.userId,
            postId: like.postId,
            name: like.name,
          });
        }
      });
    }

    res.send(joinPostsLikes);
  } catch (erro) {
    console.log(erro);
    return res.status(500).send("erro");
  }
}

export async function getAllPosts(req, res) {
  try {
    const { rows: posts } = await connection.query(
      `select users.id, posts.id AS "postId", posts."userId", users.name, users.image AS profile, posts.comment , posts.url, posts.title, posts.image, posts.description, count(likes."postId") as "likesCount" from posts inner join users on posts."userId" = users.id left join likes on posts.id = likes."postId" group by posts.id, users.id order by posts.id desc `
    );

    res.send(posts);
  } catch (erro) {
    console.log(erro);
    return res.status(500).send("erro");
  }
}
