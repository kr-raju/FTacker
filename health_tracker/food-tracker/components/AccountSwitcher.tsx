import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Type for test accounts
type TestAccount = {
  email: string;
  name: string;
};

// Predefined test accounts
const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'test1@example.com', name: 'Test User 1' },
  { email: 'test2@example.com', name: 'Test User 2' },
  { email: 'test3@example.com', name: 'Test User 3' },
];

export default function AccountSwitcher() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<TestAccount | null>(null);

  // On component mount, get current user
  useEffect(() => {
    try {
      const userDataStr = localStorage.getItem('foodtracker_current_user');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setCurrentUser({
          email: userData.email,
          name: userData.name
        });
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);

  const switchAccount = (account: TestAccount) => {
    try {
      // Create a mock user with the selected account
      const mockUser = {
        uid: `mock-user-id-${Date.now()}`,
        email: account.email,
        displayName: account.name,
        emailVerified: true,
      };
      
      // Store in localStorage for getCurrentUser to find
      localStorage.setItem('foodtracker_mock_auth_user', JSON.stringify(mockUser));
      localStorage.setItem('foodtracker_current_user', JSON.stringify({
        email: account.email,
        name: account.name
      }));
      
      // Close dropdown
      setIsDropdownOpen(false);
      
      // Force refresh the page to apply changes
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Error switching accounts:', error);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="inline-flex justify-center w-full rounded-md border border-gray-300 dark:border-gray-700 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          id="test-account-menu"
          aria-expanded="true"
          aria-haspopup="true"
        >
          {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Switch Account'}
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isDropdownOpen && (
        <div 
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="test-account-menu"
        >
          <div className="py-1" role="none">
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              Test Accounts
            </div>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => switchAccount(account)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  currentUser?.email === account.email 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                role="menuitem"
              >
                {account.name} ({account.email})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 