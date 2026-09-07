'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deliveryApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Plus, RefreshCw, Eye, Download, Package, Truck, CheckCircle, Clock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';

interface Delivery {
  id: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  delivery_fee: number;
  weight: number;
  status: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  pending: '受付中',
  in_transit: '配送中',
  delivered: '完了',
  cancelled: 'キャンセル',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_transit: 'default',
  delivered: 'outline',
  cancelled: 'destructive',
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    delivery_fee: '',
    weight: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const { logout } = useAuth();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const data = await deliveryApi.getDeliveries();
      console.log('取得した配送データ:', data);
      setDeliveries(data);
    } catch (error: any) {
      console.error('配送データ取得エラー:', error);
      toast.error('配送データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedDelivery) return;

    setIsUpdating(true);
    try {
      await deliveryApi.updateDeliveryStatus(selectedDelivery.id, newStatus);
      
      toast.success('ステータスを更新しました');
      
      // Revalidate data by fetching fresh data
      await fetchDeliveries();
      
      // Update selected delivery with new status
      setSelectedDelivery(prev => 
        prev ? { ...prev, status: newStatus as Delivery['status'] } : null
      );
      
    } catch (error: any) {
      console.error('ステータス更新エラー:', error);
      toast.error('ステータスの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRowClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsSheetOpen(true);
  };

  const calculateStats = () => {
    const total = deliveries.length;
    const pending = deliveries.filter(d => d.status === 'pending').length;
    const inTransit = deliveries.filter(d => d.status === 'in_transit').length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const cancelled = deliveries.filter(d => d.status === 'cancelled').length;
    
    return { total, pending, inTransit, delivered, cancelled };
  };

  const stats = calculateStats();

  const handlePrintPdf = async (deliveryId: number) => {
    try {
      const response = await deliveryApi.printDeliveryPdf(deliveryId);
      
      // Blob from PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `delivery_${deliveryId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleCreateDelivery = async () => {
    setIsCreating(true);
    setFormErrors({});
    try {
      await deliveryApi.createDelivery({
        recipient_name: formData.recipient_name,
        recipient_phone: formData.recipient_phone,
        recipient_address: formData.recipient_address,
        delivery_fee: parseInt(formData.delivery_fee),
        weight: parseFloat(formData.weight)
      });
      
      toast.success('配送を登録しました');
      
      // Close dialog and refresh data
      setIsDialogOpen(false);
      setFormData({
        recipient_name: '',
        recipient_phone: '',
        recipient_address: '',
        delivery_fee: '',
        weight: ''
      });
      await fetchDeliveries();
    } catch (error: any) {
      console.error('配送登録エラー:', error);
      
      // バリデーションエラーの場合はエラーメッセージを表示
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
        toast.error('入力内容を確認してください');
      } else {
        toast.error('配送の登録に失敗しました');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>読み込み中...</span>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">配送管理システム</h1>
            <div className="flex space-x-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新規配送登録
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>新規配送登録</DialogTitle>
                    <DialogDescription>
                      新しい配送情報を登録してください
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label htmlFor="recipient_name" className="text-right pt-2">
                        荷受人名
                      </label>
                      <div className="col-span-3 space-y-2">
                        <Input
                          id="recipient_name"
                          value={formData.recipient_name}
                          onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                          className={formErrors.recipient_name ? 'border-red-500' : ''}
                        />
                        {formErrors.recipient_name && (
                          <p className="text-sm text-red-500">
                            {formErrors.recipient_name[0]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label htmlFor="recipient_phone" className="text-right pt-2">
                        電話番号
                      </label>
                      <div className="col-span-3 space-y-2">
                        <Input
                          id="recipient_phone"
                          value={formData.recipient_phone}
                          onChange={(e) => setFormData({...formData, recipient_phone: e.target.value})}
                          className={formErrors.recipient_phone ? 'border-red-500' : ''}
                        />
                        {formErrors.recipient_phone && (
                          <p className="text-sm text-red-500">
                            {formErrors.recipient_phone[0]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label htmlFor="recipient_address" className="text-right pt-2">
                        配送先住所
                      </label>
                      <div className="col-span-3 space-y-2">
                        <Input
                          id="recipient_address"
                          value={formData.recipient_address}
                          onChange={(e) => setFormData({...formData, recipient_address: e.target.value})}
                          className={formErrors.recipient_address ? 'border-red-500' : ''}
                        />
                        {formErrors.recipient_address && (
                          <p className="text-sm text-red-500">
                            {formErrors.recipient_address[0]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label htmlFor="weight" className="text-right pt-2">
                        重量
                      </label>
                      <div className="col-span-3 space-y-2">
                        <Input
                          id="weight"
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({...formData, weight: e.target.value})}
                          className={formErrors.weight ? 'border-red-500' : ''}
                        />
                        {formErrors.weight && (
                          <p className="text-sm text-red-500">
                            {formErrors.weight[0]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label htmlFor="delivery_fee" className="text-right pt-2">
                        配送料金
                      </label>
                      <div className="col-span-3 space-y-2">
                        <Input
                          id="delivery_fee"
                          type="number"
                          value={formData.delivery_fee}
                          onChange={(e) => setFormData({...formData, delivery_fee: e.target.value})}
                          className={formErrors.delivery_fee ? 'border-red-500' : ''}
                        />
                        {formErrors.delivery_fee && (
                          <p className="text-sm text-red-500">
                            {formErrors.delivery_fee[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCreateDelivery} disabled={isCreating}>
                      {isCreating ? '登録中...' : '登録'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={fetchDeliveries} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">全件数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">受付中</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">配送中</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.inTransit}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">完了</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>配送一覧</CardTitle>
                <CardDescription>
                  現在の配送状況を確認できます
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-4">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    📦
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  配送データがありません
                </h3>
                <p className="text-gray-500">
                  最初の配送を作成してください
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>伝票番号</TableHead>
                      <TableHead>荷受人</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>配送料金</TableHead>
                      <TableHead>配送先</TableHead>
                      <TableHead>登録日時</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery) => (
                      <TableRow 
                        key={delivery.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRowClick(delivery)}
                      >
                        <TableCell className="font-medium">
                          #{delivery.id.toString().padStart(6, '0')}
                        </TableCell>
                        <TableCell>{delivery.recipient_name || '未設定'}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[delivery.status]}>
                            {statusLabels[delivery.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(delivery.delivery_fee)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {delivery.recipient_address}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(delivery.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>配送詳細</SheetTitle>
            <SheetDescription>
              伝票番号: #{selectedDelivery?.id.toString().padStart(6, '0')}
            </SheetDescription>
          </SheetHeader>
          
          {selectedDelivery && (
            <div className="mt-6 space-y-6 px-4">
              {/* 基本情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">基本情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">荷受人</label>
                    <p className="mt-1">{selectedDelivery.recipient_name || '未設定'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">電話番号</label>
                    <p className="mt-1">{selectedDelivery.recipient_phone || '未設定'}</p>
                  </div>
                </div>
              </div>

              {/* 配送情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">配送情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">配送先住所</label>
                    <p className="mt-1">{selectedDelivery.recipient_address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">配送料金</label>
                      <p className="mt-1 font-medium">{formatCurrency(selectedDelivery.delivery_fee)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ステータス更新 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">ステータス管理</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">現在のステータス</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={statusVariants[selectedDelivery.status]}>
                      {statusLabels[selectedDelivery.status]}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-500">ステータス更新</label>
                    <Select
                      value={selectedDelivery.status}
                      onValueChange={handleStatusUpdate}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">受付中</SelectItem>
                        <SelectItem value="in_transit">配送中</SelectItem>
                        <SelectItem value="delivered">完了</SelectItem>
                        <SelectItem value="cancelled">キャンセル</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* PDF発行 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">伝票発行</h3>
                <Button 
                  onClick={() => handlePrintPdf(selectedDelivery.id)}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  伝票PDFを発行
                </Button>
              </div>


              {/* タイムスタンプ */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">タイムスタンプ</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-sm font-medium text-gray-500">作成日時</label>
                    <p className="mt-1">{formatDate(selectedDelivery.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">更新日時</label>
                    <p className="mt-1">{formatDate(selectedDelivery.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      </div>
    </AuthGuard>
  );
}
