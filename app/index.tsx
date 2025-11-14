// In app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // This will redirect the user from the root (/)
  // to the /camera route inside your (tabs) group.
  return <Redirect href="/camera" />;
}