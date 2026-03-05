import ProfileForm from "./ProfileForm";
import { getMyAccountProfile } from "./action";

export default async function ProfilePage() {
  const profile = await getMyAccountProfile();
  return <ProfileForm initialProfile={profile} />;
}
