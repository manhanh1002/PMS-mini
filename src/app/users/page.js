'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  UsersRound, Plus, Pencil, Trash2, KeyRound, UserCircle, Shield, UserCheck, Eye, EyeOff, Loader2, Save, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tab navigation ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'members', label: 'Quản lý nhân viên', icon: UsersRound, adminOnly: true },
  { id: 'profile', label: 'Tài khoản của tôi', icon: UserCircle, adminOnly: false },
];

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  if (role === 'Admin') return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 gap-1"><UserCheck className="h-3 w-3" />Nhân viên</Badge>;
}

// ─── Password field with show/hide ───────────────────────────────────────────
function PasswordInput({ id, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Member management tab (Admin only) ───────────────────────────────────────
function MembersTab({ branches }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editUser, setEditUser] = useState(null); // null = create, object = edit
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { Username: '', Password: '', FullName: '', Role: 'Staff', BranchId: '' };
  const [form, setForm] = useState(emptyForm);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
      else toast.error(data.error || 'Không tải được danh sách nhân viên.');
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ Username: u.Username, Password: '', FullName: u.FullName, Role: u.Role, BranchId: u.BranchId || '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.FullName.trim()) { toast.error('Vui lòng nhập họ tên nhân viên.'); return; }
    if (!editUser && (!form.Username.trim() || !form.Password.trim())) {
      toast.error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'); return;
    }

    setSaving(true);
    try {
      let res, data;
      if (editUser) {
        const body = { FullName: form.FullName, Role: form.Role, BranchId: form.BranchId || null };
        if (form.Password) body.Password = form.Password;
        res = await fetch(`/api/users?id=${editUser.Id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Có lỗi xảy ra.'); return; }
      toast.success(editUser ? 'Đã cập nhật nhân viên!' : 'Đã tạo tài khoản nhân viên!');
      setShowDialog(false);
      loadUsers();
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    try {
      const res = await fetch(`/api/users?id=${u.Id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Không thể xóa.'); return; }
      toast.success('Đã xóa tài khoản!');
      setDeleteConfirm(null);
      loadUsers();
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return <span className="text-muted-foreground text-xs">Tất cả</span>;
    const b = branches.find((br) => String(br.Id) === String(branchId));
    return b ? b.BranchName : <span className="text-amber-500 text-xs">{branchId}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Danh sách nhân viên</h2>
          <p className="text-sm text-muted-foreground">{users.length} tài khoản trong hệ thống</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />Thêm nhân viên
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Họ tên</TableHead>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.Id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium">{u.FullName}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{u.Username}</TableCell>
                  <TableCell><RoleBadge role={u.Role} /></TableCell>
                  <TableCell>{getBranchName(u.BranchId)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có nhân viên nào</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editUser ? `Cập nhật thông tin cho ${editUser.FullName}` : 'Tạo tài khoản đăng nhập mới cho nhân viên'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!editUser && (
              <div className="space-y-1.5">
                <Label htmlFor="u-username">Tên đăng nhập *</Label>
                <Input id="u-username" value={form.Username} onChange={(e) => setForm({ ...form, Username: e.target.value.toLowerCase() })} placeholder="vd: letanlech1" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="u-fullname">Họ tên nhân viên *</Label>
              <Input id="u-fullname" value={form.FullName} onChange={(e) => setForm({ ...form, FullName: e.target.value })} placeholder="vd: Nguyễn Thị Lệ" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-password">{editUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}</Label>
              <PasswordInput
                id="u-password"
                value={form.Password}
                onChange={(e) => setForm({ ...form, Password: e.target.value })}
                placeholder={editUser ? 'Nhập mật khẩu mới nếu muốn đổi' : 'Tối thiểu 6 ký tự'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vai trò *</Label>
                <Select value={form.Role} onValueChange={(v) => setForm({ ...form, Role: v })}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Staff">Nhân viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Chi nhánh</Label>
                <Select value={form.BranchId || 'none'} onValueChange={(v) => setForm({ ...form, BranchId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Không gán" /></SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="none">Tất cả (Admin)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.Id} value={String(b.Id)}>{b.BranchName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-border">Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editUser ? 'Cập nhật' : 'Tạo tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteConfirm?.FullName}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-border">Hủy</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Xóa tài khoản</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Profile / Self-service tab ───────────────────────────────────────────────
function ProfileTab() {
  const { user, setUser } = useBranch();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!'); return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.'); return;
    }

    setSaving(true);
    setSuccess('');
    try {
      const body = { FullName: fullName };
      if (newPassword) { body.OldPassword = oldPassword; body.NewPassword = newPassword; }

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) { toast.error(data.error || 'Cập nhật thất bại.'); return; }

      toast.success('Cập nhật tài khoản thành công!');
      setSuccess('Thông tin đã được lưu.');

      // Update local user state if name changed
      if (fullName !== user?.fullName) {
        const updated = { ...user, fullName };
        setUser(updated);
        localStorage.setItem('pms_user', JSON.stringify(updated));
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* Info card */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <UserCircle className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-base">{user?.fullName}</p>
          <p className="text-sm text-muted-foreground font-mono">{user?.username}</p>
          <RoleBadge role={user?.role} />
        </div>
      </div>

      {/* Update Display Name */}
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" />Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-fullname">Họ tên hiển thị</Label>
            <Input id="profile-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tên đăng nhập</Label>
            <Input value={user?.username || ''} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Tên đăng nhập không thể thay đổi.</p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />Đổi mật khẩu</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Để trống nếu không muốn đổi mật khẩu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-old-pw">Mật khẩu hiện tại</Label>
            <PasswordInput id="profile-old-pw" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-new-pw">Mật khẩu mới</Label>
            <PasswordInput id="profile-new-pw" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-confirm-pw">Xác nhận mật khẩu mới</Label>
            <PasswordInput id="profile-confirm-pw" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
          </div>
        </CardContent>
      </Card>

      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
          <CheckCircle2 className="h-4 w-4" />{success}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Lưu thay đổi
      </Button>
    </div>
  );
}

// ─── Main Users Page ──────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user, branches } = useBranch();
  const [activeTab, setActiveTab] = useState(user?.role === 'Admin' ? 'members' : 'profile');

  const visibleTabs = TABS.filter((t) => !t.adminOnly || user?.role === 'Admin');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UsersRound className="h-6 w-6 text-primary" />
          Quản lý tài khoản
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.role === 'Admin' ? 'Quản lý nhân viên và tài khoản cá nhân' : 'Xem và cập nhật tài khoản của bạn'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'members' && user?.role === 'Admin' && <MembersTab branches={branches} />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>
    </div>
  );
}
