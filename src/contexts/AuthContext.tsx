import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ModuleKey, PermissionAction, RoleDefinition, UserProfile } from '../types';
import {
  canPerformAction,
  canViewRestrictedField,
  hasPermission,
  isAnyAdminRole,
  normalizeRole,
  Permission
} from '../config/rbac';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  normalizedRole: string;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isHOD: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  customPermissions: Record<string, string[]>;
  roleDefinitions: RoleDefinition[];
  can: (permission: Permission) => boolean;
  canAction: (module: ModuleKey, action: PermissionAction) => boolean;
  canViewField: (field: 'salary' | 'financials' | 'student_pii' | 'disciplinary' | 'medical') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customPermissions, setCustomPermissions] = useState<Record<string, string[]>>({});
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribePerms: (() => void) | null = null;
    let unsubscribeRoleDefs: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }
      if (unsubscribePerms) { unsubscribePerms(); unsubscribePerms = null; }
      if (unsubscribeRoleDefs) { unsubscribeRoleDefs(); unsubscribeRoleDefs = null; }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user profile:', error);
            setLoading(false);
          }
        );

        unsubscribePerms = onSnapshot(
          collection(db, 'rolePermissions'),
          (snap) => {
            const map: Record<string, string[]> = {};
            snap.docs.forEach(d => {
              const data = d.data();
              if (Array.isArray(data.permissions)) map[d.id] = data.permissions;
            });
            setCustomPermissions(map);
          },
          () => {}
        );

        unsubscribeRoleDefs = onSnapshot(
          collection(db, 'roles'),
          (snap) => {
            setRoleDefinitions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RoleDefinition)));
          },
          () => {}
        );
      } else {
        setProfile(null);
        setCustomPermissions({});
        setRoleDefinitions([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribePerms) unsubscribePerms();
      if (unsubscribeRoleDefs) unsubscribeRoleDefs();
    };
  }, []);

  const normalizedRole = normalizeRole(profile?.role);
  const facultyRoles = ['teacher', 'professor', 'teaching_assistant'];

  const value: AuthContextType = {
    user,
    profile,
    normalizedRole,
    loading,
    isSuperAdmin: normalizedRole === 'super_admin',
    isAdmin: isAnyAdminRole(profile?.role),
    isHOD: normalizedRole === 'hod',
    isTeacher: facultyRoles.includes(normalizedRole),
    isStudent: normalizedRole === 'student',
    isParent: normalizedRole === 'parent',
    customPermissions,
    roleDefinitions,
    can: (permission: Permission) => hasPermission(profile || profile?.role, permission, customPermissions, roleDefinitions),
    canAction: (module: ModuleKey, action: PermissionAction) => canPerformAction(profile, module, action, roleDefinitions),
    canViewField: (field) => canViewRestrictedField(profile, field, roleDefinitions),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
