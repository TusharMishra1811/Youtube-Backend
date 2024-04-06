import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "The channel id is not valid");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "The channel is not found");
  }

  if (channel._id.toString() === req.user?._id.toString()) {
    throw new ApiError(400, "Can not subscribe to own channel");
  }

  const isAlreadySubscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (isAlreadySubscribed) {
    const ischannelUnsubscribed = await Subscription.findByIdAndDelete(
      isAlreadySubscribed._id
    );

    if (!ischannelUnsubscribed) {
      throw new ApiError(400, "The channel is not unsubscribed successfully");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "The channel is unsubscribed"));
  } else {
    const channelSubscribed = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });

    if (!channelSubscribed) {
      throw new ApiError(400, "The channel is not subscribed successfully");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channelSubscribed,
          "The channel is subscribed successfully"
        )
      );
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "The channel id is not valid");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(400, "The channel does not exist");
  }

  const userChannelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "subscriber",
        as: "totalSubs",
      },
    },
    {
      $project: {
        totalSubs: {
          _id: 1,
          username: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (!userChannelSubscribers.length > 0) {
    throw new ApiError(400, "The channel subscribers are not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userChannelSubscribers,
        "The channel subscribers are fetched successfully"
      )
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  // const subscriberId = req.user._id;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "The subscriber id is ntot avalid");
  }

  const subscriber = await User.findById(subscriberId);

  if (!subscriber) {
    throw new ApiError(404, "The subscriber is not found");
  }

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "channel",
        as: "subscribedChannels",
      },
    },
    {
      $project: {
        subscribedChannels: {
          _id: 1,
          username: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (!channels) {
    throw new ApiError(400, "The channels are not fetched");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channels, "The channels are fetched successfully")
    );
});

export { toggleSubscription, getSubscribedChannels, getUserChannelSubscribers };

/*
$group: {
        channel: new mongoose.Types.ObjectId(channelId),
        totalSubscribers: {
          $sum: "$channel",
        },
      },
*/
