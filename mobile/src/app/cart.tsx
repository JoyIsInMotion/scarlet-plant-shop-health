import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthGuard } from '@/components/auth-guard';
import { useAuth } from '@/context/auth';
import { CartItem, useCart } from '@/context/cart';
import { ApiError, createOrder } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const COLORS = {
  scarlet: '#C2375A',
  scarletDark: '#9E2B47',
  scarletLight: '#FCEEF3',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  chipBg: '#F7EEF2',
  cream: '#FBF5F8',
  green: '#1F9D63',
  greenBg: '#E6F6EE',
};

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} лв.`;
}

// Cross-platform confirm: Alert.alert on native, window.confirm on web (where
// Alert with buttons is a no-op).
function confirmAction(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'destructive', onPress: onConfirm },
  ]);
}

function CartContent() {
  const { m } = useI18n();
  const router = useRouter();
  const { authedRequest } = useAuth();
  const { items, total, count, remove, update, clear } = useCart();

  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function goToShop() {
    // The cart is pushed over the Shop tab, so going back returns there.
    if (router.canGoBack()) router.back();
    else router.replace('/shop');
  }

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      await authedRequest((token) =>
        createOrder(
          {
            items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
            notes: notes.trim() || null,
            shippingAddress: null,
          },
          token
        )
      );
      clear();
      setNotes('');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : m.cart.orderError);
    } finally {
      setPlacing(false);
    }
  }

  // ── Order placed confirmation ──
  if (success) {
    return (
      <View style={styles.stateScreen}>
        <View style={[styles.stateIcon, styles.successIcon]}>
          <Text style={styles.successCheck}>✓</Text>
        </View>
        <Text style={styles.stateTitle}>{m.cart.orderPlaced}</Text>
        <Text style={styles.stateText}>{m.cart.orderPlacedDesc}</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.replace('/orders')}>
          <Text style={styles.primaryBtnText}>{m.orders.myOrders}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={goToShop}>
          <Text style={styles.secondaryBtnText}>{m.cart.continueShopping}</Text>
        </Pressable>
      </View>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <View style={styles.stateScreen}>
        <View style={styles.stateIcon}>
          <Text style={styles.stateEmoji}>🛒</Text>
        </View>
        <Text style={styles.stateTitle}>{m.cart.empty}</Text>
        <Text style={styles.stateText}>{m.cart.emptyHint}</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={goToShop}>
          <Text style={styles.primaryBtnText}>{m.cart.goToShop}</Text>
        </Pressable>
      </View>
    );
  }

  const itemWord = count === 1 ? m.cart.itemsOne : m.cart.itemsMany;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.countText}>
          {count} {itemWord}
        </Text>
        <Pressable hitSlop={8} onPress={() => confirmAction(m.cart.clear + '?', clear)}>
          <Text style={styles.clearLink}>{m.cart.clear}</Text>
        </Pressable>
      </View>

      {/* Items */}
      <View style={styles.itemsList}>
        {items.map((item) => (
          <CartRow
            key={item.id}
            item={item}
            eachLabel={m.cart.each}
            removeLabel={m.cart.remove}
            onRemove={() => remove(item.id)}
            onDec={() => update(item.id, item.quantity - 1)}
            onInc={() => update(item.id, item.quantity + 1)}
            incDisabled={item.stock != null && item.quantity >= item.stock}
          />
        ))}
      </View>

      {/* Fulfillment */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{m.cart.fulfillmentMethod}</Text>
        <View style={styles.fulfillRow}>
          <View style={styles.fulfillIcon}>
            <Text style={styles.fulfillEmoji}>🏪</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.fulfillTitle}>{m.cart.collectFromStore}</Text>
            <Text style={styles.fulfillDesc}>{m.cart.collectFromStoreDesc}</Text>
          </View>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>
          {m.cart.notes} <Text style={styles.optional}>({m.cart.optional})</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={m.cart.notesPlaceholder}
          placeholderTextColor={COLORS.muted}
          multiline
          maxLength={500}
        />
      </View>

      {/* Total + checkout */}
      <View style={styles.card}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{m.cart.total}</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            styles.checkoutBtn,
            placing && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
          disabled={placing}
          onPress={placeOrder}>
          <Text style={styles.primaryBtnText}>
            {placing ? m.cart.placing : m.cart.checkout}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CartRow({
  item,
  eachLabel,
  removeLabel,
  onRemove,
  onDec,
  onInc,
  incDisabled,
}: {
  item: CartItem;
  eachLabel: string;
  removeLabel: string;
  onRemove: () => void;
  onDec: () => void;
  onInc: () => void;
  incDisabled: boolean;
}) {
  return (
    <View style={styles.row}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbEmoji}>🌸</Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={removeLabel}>
            <Text style={styles.removeIcon}>🗑️</Text>
          </Pressable>
        </View>

        <View style={styles.rowBottom}>
          <View style={styles.stepper}>
            <Pressable onPress={onDec} style={styles.stepBtn} hitSlop={6}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Pressable
              onPress={onInc}
              disabled={incDisabled}
              style={[styles.stepBtn, incDisabled && styles.stepDisabled]}
              hitSlop={6}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.linePrice}>
            <Text style={styles.lineTotal}>{formatPrice(item.price * item.quantity)}</Text>
            {item.quantity > 1 && (
              <Text style={styles.eachText}>
                {formatPrice(item.price)} {eachLabel}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  return (
    <AuthGuard>
      <CartContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.scarlet,
  },
  itemsList: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: COLORS.chipBg,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 28,
  },
  rowBody: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.foreground,
    lineHeight: 20,
  },
  removeIcon: {
    fontSize: 16,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  qty: {
    width: 32,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  linePrice: {
    alignItems: 'flex-end',
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  eachText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  optional: {
    fontWeight: '500',
    textTransform: 'none',
    letterSpacing: 0,
    color: COLORS.muted,
  },
  fulfillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 12,
  },
  fulfillIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.scarletLight,
  },
  fulfillEmoji: {
    fontSize: 18,
  },
  fulfillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  fulfillDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },
  flex1: {
    flex: 1,
  },
  notesInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    padding: 12,
    fontSize: 14,
    color: COLORS.foreground,
    textAlignVertical: 'top',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  errorText: {
    color: COLORS.scarlet,
    fontSize: 13,
    backgroundColor: COLORS.scarletLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.scarlet,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  checkoutBtn: {
    borderRadius: 14,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  // State screens (empty / success)
  stateScreen: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.chipBg,
  },
  successIcon: {
    backgroundColor: COLORS.greenBg,
  },
  successCheck: {
    fontSize: 34,
    color: COLORS.green,
    fontWeight: '800',
  },
  stateEmoji: {
    fontSize: 32,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
});
