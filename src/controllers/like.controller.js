import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video ID is not a valid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "The video is not found");
  }

  const isVideoLiked = await Like.findOne({
    video: video._id,
    likedBy: req.user?._id,
  });

  if (isVideoLiked) {
    const isVideoDisliked = await Like.findByIdAndDelete(isVideoLiked._id);

    if (!isVideoDisliked) {
      throw new ApiError(
        400,
        "The action of disliking the video did not succeed."
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "The Video is disliked successfully"));
  } else {
    const isVideoLikedSuccessfully = await Like.create({
      video: video._id,
      likedBy: req.user?._id,
    });

    if (!isVideoLikedSuccessfully) {
      throw new ApiError(
        400,
        "The action of liking the video does not succeed"
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "The video is liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "The Comment is not found");
  }

  const isCommentLiked = await Comment.findOne({
    comment: comment._id,
    likedBy: req.user?._id,
  });

  if (isCommentLiked) {
    const isCommentDisliked = await Like.findByIdAndDelete(isCommentLiked._id);
    if (!isCommentDisliked) {
      throw new ApiError(
        400,
        "The action of disliking the comment does not succeed"
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "The comment is disliked successfully"));
  } else {
    const isCommentLikedSuccessfully = await Like.create({
      comment: comment._id,
      likedBy: req.user._id,
    });

    if (!isCommentLikedSuccessfully) {
      throw new ApiError(400, "The action of liking the comment succeeded");
    }

    return res.status(200).json(200, {}, "The comment is liked successfully");
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "The tweet is not found with this id");
  }

  const isTweetLiked = await Tweet.findOne({
    tweet: tweet._id,
    likedBy: req.user?._id,
  });

  if (isTweetLiked) {
    const isTweetDisliked = await Like.findByIdAndDelete(isTweetLiked._id);

    if (!isTweetDisliked) {
      throw new ApiError(
        400,
        "The action of disliking the tweet does not succeed"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "The tweet is disliked successfully"));
  } else {
    const isTweetLikedSuccessfully = await Like.create({
      tweet: tweet._id,
      likedBy: req.user?._id,
    });

    if (!isTweetLikedSuccessfully) {
      throw new ApiError(400, "The tweet is not liked successfully");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "The tweet is liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: {
          $exists: true,
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "liked_videos",
      },
    },
    {
      $project: {
        liked_videos: {
          _id: 1,
          title: 1,
          description: 1,
          views: 1,
          owner: 1,
        },
      },
    },
  ]);

  if (!likedVideos.length) {
    throw new ApiError(404, "There are no liked videos");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideos,
        "The liked videos are fetched successfully"
      )
    );
});

export { toggleVideoLike, toggleCommentLike, getLikedVideos, toggleTweetLike };
