import { v2 as cloudinary } from "cloudinary";
import { createReadStream } from "streamifier";

cloudinary.config({
  cloud_name: "media-sharing-web",
  api_key: "462917311934524",
  api_secret: "HT78a4evk0dUkEIzCjLIFUR7MWE"
});

class Uploader{
  /**
   * @param {Express.Multer.File} file
   * @returns {Promise<Parameters<Parameters<cloudinary.uploader.upload_stream>[0]>[1]>}
   */
  static uploadImage(file){
    return new Promise(function(resolve, reject){
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: "pictures",
        allowed_formats: ["jpeg"]
      }, function(error, response){
        if(error){
          return void reject(error);
        }
        resolve(response);
      });
      createReadStream(file.buffer).pipe(uploadStream);
    });
  }
  /** @param {Express.Multer.File[]} files */
  static uploadFiles(files){
    return Promise.all(files.map(file => {
      return new Promise(
      /** @param {(response: Parameters<Parameters<cloudinary.uploader.upload_stream>[0]>[1])} resolve */
      function(resolve, reject){
        try {
          const [ resource_type, format ] = file.mimetype.split("/");
          let options = {
            folder: "attachments",
            allowed_formats: ["jpeg", "png", "webp", "mpeg", "wave", "wav", "webm", "ogg", "flac"]
          };
          if(file.mimetype.includes("audio")){
            options = {
              folder: "attachments",
              resource_type: "raw"
            };
          }
          const uploadStream = cloudinary.uploader.upload_stream(options, function(error, response){
            if(error){
              return void reject(error);
            }
            if(!response.format){
              response.format = format;
              response.resource_type = resource_type;
            }
            resolve(response);
          });
          createReadStream(file.buffer).pipe(uploadStream);
        } catch(ex) {
          reject(ex);
        }
      });
    }));
  }
  static async deleteImage(publicId){
    return await cloudinary.uploader.destroy(publicId);
  }
};

export default Uploader;