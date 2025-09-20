import mongoose, { Document, Model, Schema, Types } from "mongoose";
import bcrypt from "bcrypt";
import { Roles } from "../../constants/roles";

export interface IUser extends Document {
  _id: Types.ObjectId;
  uniqueId: string;
  username: string;
  email: string;
  password: string;
  image: string | null;
  date: string;
  role: Roles ;
  refreshToken: { token:string, expiresAt: Date }[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    uniqueId: { type: String, unique: true, trim: true, default: null },
    username: { type: String, unique: true, trim: true, required: true },
    email: { type: String, unique: true, trim: true, required: true },
    password: { type: String, trim: true, required: true },
    image: { type: String, trim: true, default: null },
    refreshToken: [ { token: String, expiresAt: Date } ],
    role: { type: String, enum: Object.values(Roles), default: Roles.USER },
    date: { type: String },
  },
  {
    timestamps: true,
  }
);

// Hashin password
UserSchema.pre("save", async function (next) {
  const user = this as IUser;

  if (!user.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    return next();
  } catch (error) {
    return next(error as Error);
  }
});


// Comapre password
UserSchema.methods.comparePassword = async function (candidatePassword: string) : Promise<boolean> {
return bcrypt.compare(candidatePassword, this.password)
}


// export default mongoose.model<IUser>("User", UserSchema);
const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;