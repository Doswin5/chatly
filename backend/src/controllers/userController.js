import User from "../models/userModel.js";

export const getUsers = async (req, res) => {
  try {
    const search = req.query.search || "";

    const query = {
      _id: { $ne: req.user._id },
    };

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ name: 1 });

    res.status(200).json({
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};