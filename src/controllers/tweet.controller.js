import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "The content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(400, "The tweet is not created successfully");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "The tweet is created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "The user id is not valid");
  }

  const tweets = await Tweet.find({
    owner: userId,
  });

  if (!tweets) {
    throw new ApiError(404, "The tweets are not found for the particular user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "The tweets are fetched successfully"));
});

const updateTweets = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { description } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "The tweet ID is not valid");
  }

  if (!description) {
    throw new ApiError(400, "please provide the description");
  }

  const tweet = await Tweet.findById(tweetId);

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorised to update this tweet");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        description: description,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    throw new ApiError(404, "The tweet is not updated successfully");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTweet, "The tweet is updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "The tweet is is not valid");
  }

  const tweet = await Tweet.findById(tweetId);

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You are not authorized to delete this particular tweet"
    );
  }

  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

  if (!deleteTweet) {
    throw new ApiError(400, "the tweet is not deleted successfully");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The tweet is deleted successfully"));
});

export { createTweet, getUserTweets, updateTweets, deleteTweet };
