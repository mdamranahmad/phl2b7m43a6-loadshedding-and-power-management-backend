import { v2 } from "cloudinary";
import config from "../config/index.js";

v2.config({
    cloud_name: config.cloudinary_cloud_name,
    api_key: config.cloudinary_api_key,
    api_secret: config.cloudinary_api_secret,
});

// Temporary check to ensure they aren't undefined
console.log("Cloudinary Config Loaded:", {
    cloud_name: config.cloudinary_cloud_name ? "Loaded" : "MISSING",
    api_key: config.cloudinary_api_key ? "Loaded" : "MISSING",
    api_secret: config.cloudinary_api_secret ? "Loaded" : "MISSING",
});

export const cloudinary = v2;

// import { v2 as Cloudinary } from "cloudinary";
// import config from "../config/index.js";

// Cloudinary.config({
//     cloud_name: config.cloudinary_cloud_name,
//     api_key: config.cloudinary_api_key,
//     api_secret: config.cloudinary_api_secret,
// });

// // Temporary check to ensure they aren't undefined
// console.log("Cloudinary Config Loaded:", {
//     cloud_name: config.cloudinary_cloud_name ? "Loaded" : "MISSING",
//     api_key: config.cloudinary_api_key ? "Loaded" : "MISSING",
//     api_secret: config.cloudinary_api_secret ? "Loaded" : "MISSING",
// });

// export const cloudinary = Cloudinary;
