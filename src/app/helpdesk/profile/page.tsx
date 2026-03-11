import ProfileForm from "./ProfileForm";
import { getMyAccountProfile } from "./action";

export default async function ProfilePage() {
  const profileResult = await getMyAccountProfile();
  if (profileResult.error || !profileResult.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        {profileResult.error ?? "Failed to load profile."}
      </div>
    );
  }

  return <ProfileForm initialProfile={profileResult.data} />;
}
