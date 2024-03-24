import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createTweet = asyncHandler(async (req, res) => {});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
});

const updateTweets = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
});

export { createTweet, getUserTweets, updateTweets, deleteTweet };
