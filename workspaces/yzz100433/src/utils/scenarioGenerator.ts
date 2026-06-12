import type {
  Scenario,
  ScenarioType,
  CartItem,
  Coupon,
  Payment,
  SpecialEvent,
  SpecialEventType,
  RequiredInput,
} from '@/types';
import { getRandomProducts, PRODUCTS } from '@/data/products';
import { COUPON_TEMPLATES, DAMAGED_COUPON_TEMPLATES, createCoupon } from '@/data/coupons';
import { AmountCalculator } from './amountCalculator';
import { RuleExplainer } from './ruleExplainer';
import { generateId, roundToCents } from './formatters';
import { SCENARIO_TYPE_LABELS, SCENARIO_TYPE_WEIGHTS, POINTS_RATE } from './constants';

export class ScenarioGenerator {
  static selectScenarioType(): ScenarioType {
    const weights = SCENARIO_TYPE_WEIGHTS;
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return type as ScenarioType;
      }
    }
    return 'basic';
  }

  static generateCartItems(minItems: number = 1, maxItems: number = 5): CartItem[] {
    const count = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    const products = getRandomProducts(count);

    return products.map(product => {
      const quantity = Math.floor(Math.random() * 3) + 1;
      return {
        product,
        quantity,
        subtotal: roundToCents(product.price * quantity),
      };
    });
  }

  static generateCoupons(type: ScenarioType): Coupon[] {
    const coupons: Coupon[] = [];
    const normalCoupons = COUPON_TEMPLATES.filter(c => c.type !== 'points');
    const damagedCoupons = DAMAGED_COUPON_TEMPLATES;

    switch (type) {
      case 'basic':
        if (Math.random() > 0.3) {
          const randomTemplate = normalCoupons[Math.floor(Math.random() * normalCoupons.length)];
          coupons.push(createCoupon(randomTemplate));
        }
        break;
      case 'stacking':
        const stackable = normalCoupons.filter(c => c.isStackable);
        const nonStackable = normalCoupons.filter(c => !c.isStackable);
        if (nonStackable.length > 0 && Math.random() > 0.5) {
          coupons.push(createCoupon(nonStackable[Math.floor(Math.random() * nonStackable.length)]));
        }
        const stackCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < stackCount && i < stackable.length; i++) {
          const idx = Math.floor(Math.random() * stackable.length);
          coupons.push(createCoupon(stackable[idx]));
        }
        break;
      case 'special':
        if (Math.random() > 0.5) {
          const damagedTemplate = damagedCoupons[Math.floor(Math.random() * damagedCoupons.length)];
          coupons.push(createCoupon(damagedTemplate));
        } else {
          const randomTemplate = normalCoupons[Math.floor(Math.random() * normalCoupons.length)];
          coupons.push(createCoupon(randomTemplate));
        }
        break;
      case 'complex':
        const allNormal = [...normalCoupons];
        const count = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < count && i < allNormal.length; i++) {
          const idx = Math.floor(Math.random() * allNormal.length);
          coupons.push(createCoupon(allNormal[idx]));
          allNormal.splice(idx, 1);
        }
        break;
    }

    if (Math.random() > 0.3) {
      coupons.push(createCoupon(COUPON_TEMPLATES.find(c => c.type === 'points')!));
    }

    return coupons;
  }

  static generateSpecialEvent(type: ScenarioType, cartItems: CartItem[]): SpecialEvent {
    const noEvent: SpecialEvent = {
      type: 'none',
      description: '',
      ruleExplanation: '',
    };

    if (type === 'basic') {
      return noEvent;
    }

    if (type === 'stacking' && Math.random() > 0.5) {
      return noEvent;
    }

    const eventTypes: SpecialEventType[] = ['exchange', 'partial_refund', 'damaged_coupon', 'group_order'];
    const weights = type === 'complex' ? [25, 25, 25, 25] : [35, 35, 20, 10];

    let random = Math.random() * 100;
    let selectedType: SpecialEventType = 'none';

    for (let i = 0; i < eventTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedType = eventTypes[i];
        break;
      }
    }

    if (selectedType === 'none') {
      return noEvent;
    }

    switch (selectedType) {
      case 'exchange':
        if (cartItems.length < 1) return noEvent;
        const fromItem = cartItems[Math.floor(Math.random() * cartItems.length)];
        const otherProducts = PRODUCTS.filter(p => p.id !== fromItem.product.id);
        const toProduct = otherProducts[Math.floor(Math.random() * otherProducts.length)];
        const toItem: CartItem = {
          product: toProduct,
          quantity: fromItem.quantity,
          subtotal: roundToCents(toProduct.price * fromItem.quantity),
        };
        return {
          type: 'exchange',
          description: '顾客临时要求换商品',
          ruleExplanation: RuleExplainer.explainExchange([{ from: fromItem, to: toItem }]),
          exchangeItems: [{ from: fromItem, to: toItem }],
        };
      case 'partial_refund':
        if (cartItems.length < 2) return noEvent;
        const refundCount = Math.floor(Math.random() * (cartItems.length - 1)) + 1;
        const refundItems = [...cartItems]
          .sort(() => Math.random() - 0.5)
          .slice(0, refundCount);
        return {
          type: 'partial_refund',
          description: '顾客要求部分商品退单',
          ruleExplanation: '',
          refundItems,
        };
      case 'damaged_coupon':
        return {
          type: 'damaged_coupon',
          description: '顾客使用了一张破损的优惠券',
          ruleExplanation: '',
        };
      case 'group_order':
        return {
          type: 'group_order',
          description: '三位顾客拼单，需要分别结算',
          ruleExplanation: RuleExplainer.explainGroupOrder(),
        };
      default:
        return noEvent;
    }
  }

  static generateMemberPoints(): number {
    return Math.floor(Math.random() * 5000) + 100;
  }

  static generatePayment(finalTotal: number): Payment {
    const isCash = Math.random() > 0.4;
    if (!isCash) {
      return {
        method: 'electronic',
        amountPaid: finalTotal,
      };
    }

    const denominations = [1, 5, 10, 20, 50, 100];
    let amountPaid = finalTotal;
    while (amountPaid < finalTotal + 0.01) {
      const bills = Math.floor(Math.random() * 3) + 1;
      let total = 0;
      for (let i = 0; i < bills; i++) {
        total += denominations[Math.floor(Math.random() * denominations.length)];
      }
      amountPaid = total;
    }

    return {
      method: 'cash',
      amountPaid: roundToCents(amountPaid),
    };
  }

  static determineRequiredInputs(
    payment: Payment,
    specialEvent: SpecialEvent,
  ): RequiredInput[] {
    const inputs: RequiredInput[] = ['finalTotal'];

    if (payment.method === 'cash' && payment.amountPaid > 0) {
      inputs.push('changeAmount');
    }

    if (specialEvent.type === 'partial_refund') {
      inputs.push('refundAmount');
    }

    return inputs;
  }

  static generate(): Scenario {
    const type = this.selectScenarioType();
    let cartItems = this.generateCartItems();
    const specialEvent = this.generateSpecialEvent(type, cartItems);

    if (specialEvent.type === 'exchange' && specialEvent.exchangeItems) {
      const result = AmountCalculator.handleExchange(cartItems, specialEvent.exchangeItems);
      cartItems = result.newCartItems;
    }

    let coupons = this.generateCoupons(type);
    if (specialEvent.type === 'damaged_coupon') {
      const damagedTemplate = DAMAGED_COUPON_TEMPLATES[Math.floor(Math.random() * DAMAGED_COUPON_TEMPLATES.length)];
      coupons = [createCoupon(damagedTemplate), ...coupons.filter(c => !c.isDamaged)];
    }

    const memberPoints = this.generateMemberPoints();
    const pointsRate = POINTS_RATE;

    const originalTotal = AmountCalculator.calculateOriginalTotal(cartItems);
    const couponResult = AmountCalculator.applyCoupons(originalTotal, coupons);
    const discountTotal = couponResult.discountedTotal;

    const pointsResult = AmountCalculator.calculatePointsDeduction(
      discountTotal,
      memberPoints,
      pointsRate,
    );
    const pointsDeduction = pointsResult.deduction;

    const finalTotal = AmountCalculator.calculateFinalTotal(originalTotal, discountTotal, pointsDeduction);
    const payment = this.generatePayment(finalTotal);
    const changeAmount = AmountCalculator.calculateChange(finalTotal, payment.amountPaid);

    const requiredInputs = this.determineRequiredInputs(payment, specialEvent);
    let refundAmount = 0;
    let ruleExplanations = [...couponResult.explanations];

    if (specialEvent.type === 'partial_refund' && specialEvent.refundItems) {
      const refundResult = AmountCalculator.calculateRefund(
        cartItems,
        specialEvent.refundItems,
        coupons,
        finalTotal,
      );
      refundAmount = refundResult.refundAmount;
      ruleExplanations.push(refundResult.explanation);
      specialEvent.ruleExplanation = refundResult.explanation;
    }

    if (specialEvent.type === 'damaged_coupon') {
      const damagedCoupon = coupons.find(c => c.isDamaged);
      if (damagedCoupon) {
        ruleExplanations.unshift(RuleExplainer.explainDamagedCoupon(damagedCoupon));
      }
    }

    if (specialEvent.type === 'exchange' && specialEvent.ruleExplanation) {
      ruleExplanations.unshift(specialEvent.ruleExplanation);
    }

    if (specialEvent.type === 'group_order' && specialEvent.ruleExplanation) {
      ruleExplanations.unshift(specialEvent.ruleExplanation);
    }

    if (pointsDeduction > 0) {
      ruleExplanations.push(pointsResult.explanation);
    }

    if (payment.method === 'cash') {
      ruleExplanations.push(RuleExplainer.explainChange(payment.amountPaid, finalTotal, changeAmount));
    }

    ruleExplanations = RuleExplainer.explainCalculationProcess(
      originalTotal,
      discountTotal,
      pointsDeduction,
      finalTotal,
      ruleExplanations.filter(e => !e.startsWith('📊') && !e.startsWith('🎉')),
    );

    return {
      id: generateId('scn_'),
      type,
      typeLabel: SCENARIO_TYPE_LABELS[type],
      cartItems,
      coupons,
      memberPoints,
      pointsRate,
      payment,
      specialEvent,
      originalTotal,
      discountTotal,
      pointsDeduction,
      finalTotal,
      changeAmount,
      refundAmount,
      requiredInputs,
      ruleExplanations,
    };
  }

  static fromCache(scenarioData: Scenario): Scenario {
    return scenarioData;
  }
}
