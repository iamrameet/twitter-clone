import multer, { diskStorage } from "multer";
const storage = diskStorage({
  destination: "data/files",
  filename(request, file, callback){
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    callback(null, file.fieldname + "-" + uniqueSuffix + "." + file.originalname.split(".").pop());
  }
});

const imageHandler = multer({
  storage,
  fileFilter(request, file, callback){
    if(file.size > 5 * 1024 * 1024)
      return void callback("File size must be smaller than 5MB");
    if(file.mimetype !== "image/jpeg" && file.mimetype !== "image/jpg")
      return void callback("File type must be jpeg/jpg");
    callback(null, true);
  }
}).single("image");

const attachmentsHandler = multer({
  storage,
  fileFilter(request, file, callback){
    const formats = ["image/jpeg", "image/webp", "video/mpeg", "video/webm", "video/ogg"];
    if(file.size > 5 * 1024 * 1024)
      return void callback("File size must be smaller than 5MB");
    if(!formats.includes(file.mimetype))
      return void callback("File does not have a valid type");
    callback(null, true);
  }
}).array("attachments");

export { imageHandler, attachmentsHandler };