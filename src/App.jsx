import React, { useEffect, useState } from 'react';
import { Home, DollarSign, TrendingUp, FileText, ArrowRight, CheckCircle, AlertCircle, XCircle, Info, X, Save } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

const MortgagePowerApp = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('input');
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [formData, setFormData] = useState({
    zipCode: '',
    state: '',
    county: '',
    occupancy: 'primary',
    propertyType: 'single-family',
    purchaseIntent: 'max',
    targetPurchasePrice: '',
    annualIncome: '',
    otherMonthlyIncome: '',
    employmentType: 'w2',
    yearsInField: '',
    employmentYears: '',
    selfEmployedYears: '<2',
    incomeNeedsAveraging: false,
    coBorrower: false,
    coBorrowerAnnualIncome: '',
    coBorrowerCreditScore: '720+',
    coBorrowerMonthlyDebts: '',
    monthlyDebts: '',
    studentLoansIncluded: false,
    studentLoanPayment: '',
    childSupportAlimony: '',
    creditScore: '720+',
    bankruptcy: false,
    latePayments: false,
    collections: false,
    citizenshipStatus: 'us-citizen',
    currentlyOwnHome: false,
    currentMortgageBalance: '',
    currentMortgagePayment: '',
    currentHomeDisposition: 'sell',
    downPayment: '',
    downPaymentType: 'dollars',
    downPaymentSource: 'own',
    giftDonorRelationship: '',
    giftAmount: '',
    giftLetterObtained: false,
    purchaseTimeline: 'now',
    hasPropertyIdentified: false,
    underContract: false,
    investmentPropertiesOwned: '',
    rentalIncome: '',
    rentalMortgages: '',
    closingCosts: '',
    reservesMonths: '',
    retirementFunds: false,
    firstTimeHomebuyer: false,
    veteranEligible: false,
    employmentGaps: false,
    interestRate: '',
    loanTermYears: '30',
    propertyTaxRate: '1.2',
    insuranceRate: '0.5',
    hoaMonthly: ''
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [zipLookup, setZipLookup] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/uszips.json')
      .then(response => response.json())
      .then(data => {
        if (isMounted) setZipLookup(data);
      })
      .catch(() => {
        if (isMounted) setZipLookup({});
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (formData.occupancy === 'second' && formData.propertyType === 'multi-family') {
      setFormData(prev => ({ ...prev, propertyType: 'single-family' }));
    }
  }, [formData.occupancy, formData.propertyType]);

  useEffect(() => {
    if (!zipLookup) return;
    if (formData.zipCode.length !== 5) return;
    const zipData = zipLookup[formData.zipCode];
    setFormData(prev => ({
      ...prev,
      state: zipData?.state || '',
      county: zipData?.county || ''
    }));
  }, [zipLookup, formData.zipCode]);

  const handleZipChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    const zipData = zipLookup && cleaned.length === 5 ? zipLookup[cleaned] : null;
    setFormData(prev => ({
      ...prev,
      zipCode: cleaned,
      state: zipData?.state || '',
      county: zipData?.county || ''
    }));
  };

  const handleInterestRateChange = (value) => {
    if (value === '') {
      updateField('interestRate', '');
      return;
    }
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      updateField('interestRate', value);
      return;
    }
    const clamped = Math.min(10, Math.max(3, parsed));
    updateField('interestRate', clamped.toString());
  };

  const getScoreInterpretation = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'green', description: 'Strong financing position with access to best rates and loan options' };
    if (score >= 65) return { level: 'Good', color: 'blue', description: 'Solid financing profile with good loan options available' };
    if (score >= 50) return { level: 'Fair', color: 'yellow', description: 'Moderate financing position - some improvements will help' };
    if (score >= 35) return { level: 'Needs Work', color: 'orange', description: 'Challenging financing position - focus on improvements' };
    return { level: 'Difficult', color: 'red', description: 'Significant challenges - work with specialist lenders' };
  };

  const generateImprovementRecommendations = (formData, currentScore, breakdown) => {
    const recommendations = [];

    // Income improvements
    const currentMonthlyIncome = (parseFloat(formData.annualIncome) || 0) / 12;
    if (currentMonthlyIncome < 5000) {
      const potentialGain = Math.min(30, ((5000 - currentMonthlyIncome) / 5000) * 30);
      recommendations.push({
        category: 'Income',
        issue: 'Income below optimal level',
        action: 'Increase gross annual income to $60,000+',
        potentialGain: Math.round(potentialGain),
        priority: 'high'
      });
    }

    if (!formData.coBorrower && !formData.veteranEligible) {
      recommendations.push({
        category: 'Income',
        issue: 'Single borrower application',
        action: 'Consider adding a co-borrower to increase income',
        potentialGain: 3,
        priority: 'medium'
      });
    }

    // Debt improvements
    const monthlyDebts = parseFloat(formData.monthlyDebts) || 0;
    const totalDebts = monthlyDebts + (parseFloat(formData.childSupportAlimony) || 0);
    const grossMonthlyIncome = ((parseFloat(formData.annualIncome) || 0) / 12);
    const dtiRatio = grossMonthlyIncome > 0 ? totalDebts / grossMonthlyIncome : 0;

    if (dtiRatio > 0.2) {
      const targetDebt = grossMonthlyIncome * 0.2;
      const debtReduction = totalDebts - targetDebt;
      recommendations.push({
        category: 'Debt',
        issue: `DTI at ${(dtiRatio * 100).toFixed(1)}% - above ideal`,
        action: `Pay down approximately $${Math.round(debtReduction)}/month in debts`,
        potentialGain: Math.round(Math.min(10, (dtiRatio - 0.2) * 50)),
        priority: 'high'
      });
    }

    // Credit improvements
    if (formData.creditScore !== '720+') {
      const currentTier = { '680-719': 20, '640-679': 16.25, '600-639': 12.5, '<600': 8.75 }[formData.creditScore] || 8.75;
      recommendations.push({
        category: 'Credit',
        issue: `Credit score in ${formData.creditScore} range`,
        action: 'Work on improving credit score to 720+',
        potentialGain: Math.round(23.75 - currentTier),
        priority: 'high'
      });
    }

    if (formData.latePayments) {
      recommendations.push({
        category: 'Credit',
        issue: 'Recent mortgage late payments',
        action: 'Wait 12 months from last mortgage late payment for better rates',
        potentialGain: 10,
        priority: 'medium'
      });
    }

    if (formData.collections) {
      recommendations.push({
        category: 'Credit',
        issue: 'Outstanding collections or judgments',
        action: 'Resolve all collections, judgments, and liens',
        potentialGain: 8,
        priority: 'high'
      });
    }

    if (formData.bankruptcy) {
      recommendations.push({
        category: 'Credit',
        issue: 'Recent bankruptcy (within 2 years)',
        action: 'Wait until 2 years from bankruptcy discharge date',
        potentialGain: 15,
        priority: 'high'
      });
    }

    // Down payment improvements
    const downPaymentPct = formData.downPaymentType === 'percent'
      ? (parseFloat(formData.downPayment) || 0) / 100
      : 0.05; // estimate if in dollars

    if (downPaymentPct < 0.2) {
      const potentialGain = Math.round((0.2 - downPaymentPct) * 100);
      recommendations.push({
        category: 'Down Payment',
        issue: `Down payment at ${(downPaymentPct * 100).toFixed(0)}%`,
        action: 'Increase down payment to 20% to avoid PMI and improve score',
        potentialGain: Math.min(potentialGain, 15),
        priority: 'medium'
      });
    }

    // Reserves improvements
    const reserves = parseFloat(formData.reservesMonths) || 0;
    if (reserves < 6) {
      const potentialGain = reserves < 2 ? 10 : 5;
      recommendations.push({
        category: 'Reserves',
        issue: `Only ${reserves} months of reserves`,
        action: 'Build savings to 6+ months of PITI payments',
        potentialGain,
        priority: reserves < 2 ? 'high' : 'medium'
      });
    }

    // Employment improvements
    const employmentYears = parseFloat(formData.employmentYears) || 0;
    if (employmentYears > 0 && employmentYears < 2) {
      recommendations.push({
        category: 'Employment',
        issue: 'Less than 2 years at current employer',
        action: 'Stay at current job to build employment history',
        potentialGain: 5,
        priority: 'low'
      });
    } else if (employmentYears >= 2 && employmentYears < 5) {
      recommendations.push({
        category: 'Employment',
        issue: 'Good employment history',
        action: 'Continue building employment history (5+ years = bonus)',
        potentialGain: 3,
        priority: 'low'
      });
    }

    // Gift funds
    if ((formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo') && !formData.giftLetterObtained) {
      recommendations.push({
        category: 'Documentation',
        issue: 'Gift funds without letter',
        action: 'Obtain gift letter from donor',
        potentialGain: 2,
        priority: 'medium'
      });
    }

    // Timeline
    if (formData.purchaseTimeline === '3-6' || formData.purchaseTimeline === '6+') {
      recommendations.push({
        category: 'Timeline',
        issue: 'Extended purchase timeline',
        action: 'Being ready to buy sooner improves negotiating position',
        potentialGain: 2,
        priority: 'low'
      });
    }

    // Citizenship
    if (formData.citizenshipStatus === 'work-visa' || formData.citizenshipStatus === 'other') {
      recommendations.push({
        category: 'Citizenship',
        issue: 'Non-permanent resident status',
        action: 'Work toward permanent residency or citizenship if possible',
        potentialGain: 3,
        priority: 'low'
      });
    }

    // Sort by priority and potential gain
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.potentialGain - a.potentialGain;
    });

    // Only return top recommendations that are actually relevant
    return recommendations.slice(0, 8);
  };

  const getLoanQualificationByScore = (score) => {
    const qualifications = [];

    if (score >= 75) {
      qualifications.push({ loan: 'Conventional', status: 'Excellent fit', rates: 'Best rates available' });
      qualifications.push({ loan: 'Jumbo', status: 'Qualified', rates: 'Competitive rates' });
    } else if (score >= 65) {
      qualifications.push({ loan: 'Conventional', status: 'Good fit', rates: 'Good rates' });
      qualifications.push({ loan: 'FHA', status: 'Strong candidate', rates: 'Standard rates' });
    } else if (score >= 50) {
      qualifications.push({ loan: 'FHA', status: 'Likely qualified', rates: 'Standard rates' });
      qualifications.push({ loan: 'Conventional', status: 'Possible with improvements', rates: 'Higher rates' });
    } else if (score >= 35) {
      qualifications.push({ loan: 'FHA', status: 'May qualify', rates: 'Higher rates' });
      qualifications.push({ loan: 'Non-QM', status: 'Alternative option', rates: 'Premium rates' });
    } else {
      qualifications.push({ loan: 'Non-QM', status: 'Best option', rates: 'Premium rates' });
      qualifications.push({ loan: 'FHA', status: 'Challenging', rates: 'May not qualify' });
    }

    return qualifications;
  };

  const calculateResults = () => {
    const annualIncome = parseFloat(formData.annualIncome) || 0;
    const coBorrowerAnnualIncome = formData.coBorrower ? (parseFloat(formData.coBorrowerAnnualIncome) || 0) : 0;
    const otherIncome = parseFloat(formData.otherMonthlyIncome) || 0;
    const monthlyDebts = parseFloat(formData.monthlyDebts) || 0;
    const coBorrowerDebts = formData.coBorrower ? (parseFloat(formData.coBorrowerMonthlyDebts) || 0) : 0;
    const childSupportAlimony = parseFloat(formData.childSupportAlimony) || 0;
    const currentMortgagePayment = formData.currentlyOwnHome && formData.currentHomeDisposition === 'rent'
      ? (parseFloat(formData.currentMortgagePayment) || 0)
      : 0;
    const rentalIncome = parseFloat(formData.rentalIncome) || 0;
    const rentalMortgages = parseFloat(formData.rentalMortgages) || 0;
    // Lenders typically count 75% of rental income
    const qualifyingRentalIncome = rentalIncome * 0.75;
    const downPaymentInput = parseFloat(formData.downPayment) || 0;
    const downPaymentPercent = formData.downPaymentType === 'percent'
      ? downPaymentInput / 100
      : null;
    const downPaymentDollarsStatic = formData.downPaymentType === 'dollars'
      ? downPaymentInput
      : 0;
    const studentLoanPayment = formData.studentLoansIncluded
      ? parseFloat(formData.studentLoanPayment) || 0
      : 0;
    const incomeMultiplier = formData.incomeNeedsAveraging ? 0.85 : 1;
    const grossMonthlyIncome = ((annualIncome * incomeMultiplier) / 12) + ((coBorrowerAnnualIncome * incomeMultiplier) / 12) + (otherIncome * incomeMultiplier) + qualifyingRentalIncome;
    const totalMonthlyDebts = monthlyDebts + coBorrowerDebts + studentLoanPayment + childSupportAlimony + currentMortgagePayment + rentalMortgages;
    
    // Credit tier mapping
    const creditTiers = {
      '720+': { rate: 6.5, score: 95, tier: 'Excellent', numericScore: 720 },
      '680-719': { rate: 7.0, score: 80, tier: 'Good', numericScore: 680 },
      '640-679': { rate: 7.5, score: 65, tier: 'Fair', numericScore: 640 },
      '600-639': { rate: 8.0, score: 50, tier: 'Poor', numericScore: 600 },
      '<600': { rate: 9.0, score: 35, tier: 'Very Poor', numericScore: 580 }
    };

    // Use lower credit score if co-borrower exists
    const primaryCreditInfo = creditTiers[formData.creditScore];
    const coBorrowerCreditInfo = formData.coBorrower ? creditTiers[formData.coBorrowerCreditScore] : primaryCreditInfo;
    const creditInfo = primaryCreditInfo.numericScore <= coBorrowerCreditInfo.numericScore ? primaryCreditInfo : coBorrowerCreditInfo;
    const assumedRate = formData.interestRate !== ''
      ? parseFloat(formData.interestRate) || creditInfo.rate
      : creditInfo.rate;
    const loanTermYears = parseInt(formData.loanTermYears, 10) || 30;
    
    // DTI scenarios
    const dtiScenarios = [
      { name: 'Safe', dti: 0.36 },
      { name: 'Target', dti: 0.43 },
      { name: 'Stretch', dti: 0.50 }
    ];
    
    // Property tax / insurance assumptions (percent annually)
    const propertyTaxRate = (parseFloat(formData.propertyTaxRate) || 0) / 100;
    const insuranceRate = (parseFloat(formData.insuranceRate) || 0) / 100;
    const hoaEstimate = parseFloat(formData.hoaMonthly) || 0;
    
    const scenarios = dtiScenarios.map(scenario => {
      const maxTotalDebt = grossMonthlyIncome * scenario.dti;
      const maxHousingPayment = maxTotalDebt - totalMonthlyDebts;
      
      // Estimate taxes, insurance, HOA (we'll iterate)
      let estimatedLoan = 300000; // starting estimate
      let iterations = 0;
      
      while (iterations < 10) {
        const purchasePrice = downPaymentPercent !== null
          ? estimatedLoan / Math.max(1 - downPaymentPercent, 0.01)
          : estimatedLoan + downPaymentDollarsStatic;
        const downPaymentDollars = purchasePrice - estimatedLoan;
        const monthlyTax = purchasePrice * propertyTaxRate / 12;
        const monthlyInsurance = purchasePrice * insuranceRate / 12;
        
        // PMI calculation (if down payment < 20%)
        const loanAmount = estimatedLoan;
        const ltv = purchasePrice > 0 ? loanAmount / purchasePrice : 0;
        const monthlyPMI = ltv > 0.8 ? loanAmount * 0.005 / 12 : 0;
        
        const maxPI = maxHousingPayment - monthlyTax - monthlyInsurance - hoaEstimate - monthlyPMI;
        if (maxPI <= 0 || !isFinite(maxPI)) {
          estimatedLoan = 0;
          break;
        }
        
        // Calculate loan amount from P&I using amortization formula
        const monthlyRate = assumedRate / 100 / 12;
        const numPayments = loanTermYears * 12;
        const newLoanAmount = monthlyRate > 0
          ? maxPI * ((Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments)))
          : maxPI * numPayments;
        
        if (Math.abs(newLoanAmount - estimatedLoan) < 1000) {
          estimatedLoan = newLoanAmount;
          break;
        }
        estimatedLoan = newLoanAmount;
        iterations++;
      }
      
      const maxPurchasePrice = downPaymentPercent !== null
        ? estimatedLoan / Math.max(1 - downPaymentPercent, 0.01)
        : estimatedLoan + downPaymentDollarsStatic;
      
      return {
        name: scenario.name,
        maxPrice: maxPurchasePrice,
        maxLoan: estimatedLoan,
        monthlyPayment: maxHousingPayment
      };
    });
    
    // Calculate PP Score (0-100)
    let ppScore = 0;
    
    // Income strength (30 points)
    const incomeScore = Math.min(30, (grossMonthlyIncome / 5000) * 30);
    ppScore += incomeScore;
    
    // Debt load (25 points) - lower is better
    const dtiRatio = grossMonthlyIncome > 0 ? totalMonthlyDebts / grossMonthlyIncome : 1;
    const debtScore = Math.max(0, 25 * (1 - dtiRatio / 0.5));
    ppScore += debtScore;
    
    // Credit tier (25 points)
    ppScore += (creditInfo.score / 100) * 25;
    
    // Cash/down payment (20 points)
    const targetPrice = scenarios[1].maxPrice;
    const downPaymentDollarsForScore = downPaymentPercent !== null
      ? targetPrice * downPaymentPercent
      : downPaymentDollarsStatic;
    const downPaymentPct = targetPrice > 0 ? downPaymentDollarsForScore / targetPrice : 0;
    const cashScore = Math.min(20, downPaymentPct * 100);
    ppScore += cashScore;
    
    // Penalties / bonuses
    if (formData.bankruptcy) ppScore -= 15;
    if (formData.latePayments) ppScore -= 10;
    if (formData.collections) ppScore -= 8;
    if (formData.incomeNeedsAveraging) ppScore -= 5;
    const employmentYears = parseFloat(formData.employmentYears) || 0;
    if (employmentYears > 0 && employmentYears < 2) ppScore -= 5;
    if (employmentYears >= 5) ppScore += 3;
    if ((formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo') && downPaymentPct < 0.1) ppScore -= 3;
    if (formData.giftLetterObtained && (formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo')) ppScore += 2;
    const reservesMonths = parseFloat(formData.reservesMonths) || 0;
    if (reservesMonths >= 6) ppScore += 5;
    if (reservesMonths > 0 && reservesMonths < 2) ppScore -= 5;
    if (formData.firstTimeHomebuyer && downPaymentPct < 0.05) ppScore -= 5;
    if (formData.veteranEligible) ppScore += 3;
    if (formData.coBorrower) ppScore += 3;
    if (formData.citizenshipStatus === 'work-visa' || formData.citizenshipStatus === 'other') ppScore -= 3;
    if (formData.underContract) ppScore += 2;
    if (formData.purchaseTimeline === 'now' || formData.purchaseTimeline === '1-3') ppScore += 2;
    
    ppScore = Math.max(0, Math.min(100, Math.round(ppScore)));

    // Determine loan tracks with enhanced comparison data
    const loanTracks = [];
    const conformingLimitByState = {
      AK: 1149825,
      HI: 1149825
    };
    const conformingLimit = conformingLimitByState[formData.state] || 766550;

    // Conventional
    if (formData.creditScore === '720+' || formData.creditScore === '680-719') {
      if (dtiRatio < 0.45 && !formData.bankruptcy && !formData.collections) {
        const hasIssues = (formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo') && downPaymentPct < 0.1;
        const isNonCitizen = formData.citizenshipStatus === 'work-visa' || formData.citizenshipStatus === 'other';
        const status = hasIssues || isNonCitizen ? 'possible' : 'likely';
        const score = status === 'likely' ? 95 : 75;

        loanTracks.push({
          name: 'Conventional',
          status,
          reason: 'Strong credit and healthy DTI ratio',
          score,
          badge: formData.creditScore === '720+' && dtiRatio < 0.36 ? 'Best Rates' : null,
          minDownPayment: 0.03,
          estimatedRate: creditInfo.rate,
          pmiRequired: downPaymentPct < 0.20,
          pros: [
            'Lowest interest rates available',
            downPaymentPct >= 0.20 ? 'No PMI required' : 'PMI drops off at 20% equity',
            'Highest loan limits',
            'Flexible property types'
          ],
          cons: [
            downPaymentPct < 0.20 ? 'PMI required with less than 20% down' : null,
            'Stricter credit requirements',
            'Lower DTI tolerance than FHA'
          ].filter(Boolean),
          bestFor: 'Buyers with good credit seeking the best rates and terms',
          monthlyPaymentEst: scenarios[1].monthlyPayment
        });
      }
    }

    // FHA
    if (parseInt(formData.creditScore.split('-')[0] || formData.creditScore.replace('+', '').replace('<', '')) >= 580 || formData.creditScore === '600-639') {
      if (downPaymentPct >= 0.035 || downPaymentDollarsForScore >= 10000 || formData.firstTimeHomebuyer) {
        const status = (downPaymentPct >= 0.035 || downPaymentDollarsForScore >= 10000) ? 'likely' : 'possible';
        const score = status === 'likely' ? 85 : 65;
        const fhaRate = creditInfo.rate + 0.25; // FHA typically 0.25% higher

        // Prioritize FHA if lower credit or first time buyer with low down payment
        let badge = null;
        if (formData.firstTimeHomebuyer && downPaymentPct < 0.05) badge = 'Recommended';
        else if (formData.creditScore === '640-679' || formData.creditScore === '600-639') badge = 'Best Option';
        else if (downPaymentPct < 0.05) badge = 'Lowest Down Payment';

        loanTracks.push({
          name: 'FHA',
          status,
          reason: 'More flexible credit and down payment requirements',
          score: badge === 'Recommended' || badge === 'Best Option' ? score + 15 : score,
          badge,
          minDownPayment: 0.035,
          estimatedRate: fhaRate,
          pmiRequired: true,
          pros: [
            'Only 3.5% down payment required',
            'More lenient credit requirements (580+ FICO)',
            'Higher DTI tolerance (up to 50%)',
            'Gift funds allowed for entire down payment',
            formData.firstTimeHomebuyer ? 'Great for first-time buyers' : null
          ].filter(Boolean),
          cons: [
            'Mortgage insurance required for life of loan (unless 10%+ down)',
            'Upfront mortgage insurance premium (1.75% of loan)',
            'Slightly higher interest rates',
            'Property must meet FHA standards'
          ],
          bestFor: 'First-time buyers or those with limited savings for down payment',
          monthlyPaymentEst: scenarios[1].monthlyPayment * 1.04 // ~4% higher due to MIP
        });
      }
    }

    // VA
    if (formData.occupancy === 'primary' && formData.veteranEligible) {
      const isEligibleCitizen = formData.citizenshipStatus === 'us-citizen' || formData.citizenshipStatus === 'permanent-resident';
      if (isEligibleCitizen) {
        const status = formData.bankruptcy || formData.collections ? 'possible' : 'likely';
        const score = 100; // VA is almost always best if eligible
        const vaRate = creditInfo.rate - 0.25; // VA typically has lower rates

        loanTracks.push({
          name: 'VA',
          status,
          reason: 'VA eligibility provides best terms available',
          score,
          badge: 'Highly Recommended',
          minDownPayment: 0,
          estimatedRate: vaRate,
          pmiRequired: false,
          pros: [
            'No down payment required (0% down)',
            'No PMI ever',
            'Lower interest rates than conventional',
            'More lenient credit requirements',
            'Seller can pay all closing costs',
            'No prepayment penalties'
          ],
          cons: [
            'VA funding fee (2.15% first-time, can be financed)',
            'Property must meet VA appraisal standards',
            'Only for primary residence',
            'Limited to eligible veterans/service members'
          ],
          bestFor: 'Veterans and active military seeking the most favorable terms',
          monthlyPaymentEst: scenarios[1].monthlyPayment * 0.92 // ~8% lower (no PMI + better rate)
        });
      }
    }

    // Jumbo
    if (scenarios[1].maxLoan > conformingLimit) {
      if (formData.creditScore === '720+' && downPaymentPct >= 0.20) {
        const status = 'possible';
        const score = 70;
        const jumboRate = creditInfo.rate + 0.5;

        loanTracks.push({
          name: 'Jumbo',
          status,
          reason: 'Loan amount exceeds conforming limits',
          score,
          badge: null,
          minDownPayment: 0.20,
          estimatedRate: jumboRate,
          pmiRequired: false,
          pros: [
            'Higher loan amounts available',
            'No PMI with 20%+ down',
            'Flexible underwriting',
            'Can finance luxury properties'
          ],
          cons: [
            'Higher interest rates',
            'Requires 20%+ down payment',
            'Stricter credit requirements (typically 700+ FICO)',
            'Lower DTI limits (usually 43% max)',
            'Larger cash reserves required (6-12 months)'
          ],
          bestFor: 'High-income buyers purchasing above conforming loan limits',
          monthlyPaymentEst: scenarios[1].monthlyPayment * 1.08
        });
      } else {
        loanTracks.push({
          name: 'Jumbo',
          status: 'unlikely',
          reason: 'Need higher credit score and larger down payment for jumbo loans',
          score: 30,
          badge: null,
          minDownPayment: 0.20,
          estimatedRate: creditInfo.rate + 0.75,
          pmiRequired: false,
          pros: ['Higher loan amounts available'],
          cons: [
            'Requires excellent credit (720+)',
            'Minimum 20% down payment',
            'Much stricter qualification'
          ],
          bestFor: 'Not recommended for your current profile',
          monthlyPaymentEst: null
        });
      }
    }

    // Non-QM
    if (formData.employmentType === 'self-employed' || formData.bankruptcy || formData.collections || dtiRatio > 0.45 || (formData.citizenshipStatus !== 'us-citizen' && formData.citizenshipStatus !== 'permanent-resident')) {
      const score = loanTracks.length === 0 ? 80 : 50; // Higher score if it's only option
      const nonQMRate = creditInfo.rate + 1.5;

      loanTracks.push({
        name: 'Non-QM',
        status: 'possible',
        reason: 'Alternative documentation for non-traditional borrowers',
        score,
        badge: loanTracks.length === 0 ? 'Best Option' : null,
        minDownPayment: 0.10,
        estimatedRate: nonQMRate,
        pmiRequired: downPaymentPct < 0.20,
        pros: [
          'Alternative income documentation (bank statements, assets)',
          'More flexible credit history review',
          'Higher DTI tolerance',
          formData.employmentType === 'self-employed' ? 'Designed for self-employed borrowers' : null,
          'Work visa holders may qualify'
        ].filter(Boolean),
        cons: [
          'Significantly higher interest rates (1-3% higher)',
          'Larger down payment typically required (10-20%)',
          'Higher fees and closing costs',
          'Fewer lenders offer these products',
          'May require larger cash reserves'
        ],
        bestFor: 'Self-employed, recent credit issues, or non-traditional income',
        monthlyPaymentEst: scenarios[1].monthlyPayment * 1.15
      });
    }

    // Sort loan tracks by score (highest first)
    loanTracks.sort((a, b) => b.score - a.score);

    const targetCheck = (() => {
      if (formData.purchaseIntent !== 'specific') return null;
      const targetPrice = parseFloat(formData.targetPurchasePrice);
      if (!targetPrice || targetPrice <= 0) return null;
      const targetDownPayment = downPaymentPercent !== null
        ? targetPrice * downPaymentPercent
        : Math.min(downPaymentDollarsStatic, targetPrice);
      const targetLoanAmount = Math.max(0, targetPrice - targetDownPayment);
      const targetMonthlyRate = assumedRate / 100 / 12;
      const targetNumPayments = loanTermYears * 12;
      const targetMonthlyPI = targetMonthlyRate > 0
        ? targetLoanAmount * (targetMonthlyRate * Math.pow(1 + targetMonthlyRate, targetNumPayments)) / (Math.pow(1 + targetMonthlyRate, targetNumPayments) - 1)
        : targetLoanAmount / targetNumPayments;
      const targetMonthlyTax = targetPrice * propertyTaxRate / 12;
      const targetMonthlyInsurance = targetPrice * insuranceRate / 12;
      const targetLtv = targetPrice > 0 ? targetLoanAmount / targetPrice : 0;
      const targetMonthlyPMI = targetLtv > 0.8 ? targetLoanAmount * 0.005 / 12 : 0;
      const targetHousingPayment = targetMonthlyPI + targetMonthlyTax + targetMonthlyInsurance + hoaEstimate + targetMonthlyPMI;
      const targetDTI = grossMonthlyIncome > 0
        ? (totalMonthlyDebts + targetHousingPayment) / grossMonthlyIncome
        : 1;
      return {
        targetPrice,
        targetHousingPayment,
        targetDTI
      };
    })();
    
    const breakdown = {
      income: Math.round(incomeScore / 30 * 100),
      debt: Math.round(debtScore / 25 * 100),
      credit: creditInfo.score,
      cash: Math.round(cashScore / 20 * 100)
    };

    return {
      ppScore,
      scenarios,
      loanTracks,
      breakdown,
      creditTier: creditInfo.tier,
      estimatedRate: assumedRate,
      loanTermYears,
      propertyTaxRate: propertyTaxRate * 100,
      insuranceRate: insuranceRate * 100,
      hoaMonthly: hoaEstimate,
      targetCheck,
      scoreInterpretation: getScoreInterpretation(ppScore),
      improvements: generateImprovementRecommendations(formData, ppScore, breakdown),
      loanQualifications: getLoanQualificationByScore(ppScore)
    };
  };

  const handleCalculate = () => {
    setCurrentPage('results');
  };

  const results = currentPage === 'results' ? calculateResults() : null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const saveCalculation = async () => {
    if (!user) {
      setSaveMessage('Please log in to save your calculation');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const results = calculateResults();

      const { error } = await supabase.from('calculator_sessions').insert([{
        user_id: user.id,
        ...formData,
        pp_score: results.ppScore,
        max_purchase_price_safe: results.scenarios[0].maxPrice,
        max_purchase_price_target: results.scenarios[1].maxPrice,
        max_purchase_price_stretch: results.scenarios[2].maxPrice,
      }]);

      if (error) throw error;
      setSaveMessage('✓ Calculation saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error saving calculation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (currentPage === 'input') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-4 pb-safe">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Home className="w-8 h-8 text-indigo-600" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Get Your Purchasing Power Score</h1>
              </div>
              <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">Complete this quick assessment in under 3 minutes to discover your home buying potential.</p>

            {/* Section A - Basics */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Property Basics
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.zipCode}
                    onChange={(e) => handleZipChange(e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <input
                    type="text"
                    value={formData.state}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                    placeholder="Auto-filled"
                    maxLength={2}
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-filled from ZIP code</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Occupancy *</label>
                  <select
                    value={formData.occupancy}
                    onChange={(e) => updateField('occupancy', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="primary">Primary Residence</option>
                    <option value="second">Second Home</option>
                    <option value="investment">Investment Property</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => updateField('propertyType', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="single-family">Single-Family</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="condo">Condo</option>
                    {formData.occupancy !== 'second' && (
                      <option value="multi-family">
                        Multi-Family (2-4 units){formData.occupancy === 'primary' ? ' (owner-occupied only)' : ''}
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Intent *</label>
                  <select
                    value={formData.purchaseIntent}
                    onChange={(e) => updateField('purchaseIntent', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="max">Find Maximum Purchasing Power</option>
                    <option value="specific">Evaluate a Specific Home</option>
                  </select>
                </div>
                {formData.purchaseIntent === 'specific' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Purchase Price *</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.targetPurchasePrice}
                      onChange={(e) => updateField('targetPurchasePrice', e.target.value)}
                      className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="450000"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Timeline *</label>
                  <select
                    value={formData.purchaseTimeline}
                    onChange={(e) => updateField('purchaseTimeline', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="now">Looking now / Ready to buy</option>
                    <option value="1-3">1-3 months</option>
                    <option value="3-6">3-6 months</option>
                    <option value="6+">6+ months</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasPropertyIdentified}
                    onChange={(e) => updateField('hasPropertyIdentified', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Specific property identified</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.underContract}
                    onChange={(e) => updateField('underContract', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Already under contract</span>
                </label>
              </div>
            </div>

            {/* Section B - Income */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Income
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gross Annual Income *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.annualIncome}
                    onChange={(e) => updateField('annualIncome', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="75000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Monthly Income</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.otherMonthlyIncome}
                    onChange={(e) => updateField('otherMonthlyIncome', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bonus, commission, side income</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years in the Field *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.yearsInField}
                    onChange={(e) => updateField('yearsInField', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="5"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type *</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => updateField('employmentType', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="w2">W-2 Employee</option>
                    <option value="1099">1099 Contractor</option>
                    <option value="self-employed">Self-Employed</option>
                  </select>
                </div>
                {formData.employmentType === 'self-employed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Years Self-Employed *</label>
                    <select
                      value={formData.selfEmployedYears}
                      onChange={(e) => updateField('selfEmployedYears', e.target.value)}
                      className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    >
                      <option value="<2">Less than 2 years</option>
                      <option value=">=2">2+ years</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years at Current Employer</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.employmentYears}
                    onChange={(e) => updateField('employmentYears', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.employmentGaps}
                    onChange={(e) => updateField('employmentGaps', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Employment gaps in the last 2 years</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.incomeNeedsAveraging}
                    onChange={(e) => updateField('incomeNeedsAveraging', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Income requires 2-year averaging (bonus/commission/OT)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.coBorrower}
                    onChange={(e) => updateField('coBorrower', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Co-borrower on the loan</span>
                </label>
              </div>

              {/* Co-Borrower Fields */}
              {formData.coBorrower && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Co-Borrower Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Co-Borrower Gross Annual Income *</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formData.coBorrowerAnnualIncome}
                        onChange={(e) => updateField('coBorrowerAnnualIncome', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                        placeholder="60000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Co-Borrower Credit Score Range *</label>
                      <select
                        value={formData.coBorrowerCreditScore}
                        onChange={(e) => updateField('coBorrowerCreditScore', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      >
                        <option value="720+">720+ (Excellent)</option>
                        <option value="680-719">680-719 (Good)</option>
                        <option value="640-679">640-679 (Fair)</option>
                        <option value="600-639">600-639 (Poor)</option>
                        <option value="<600">Below 600</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Co-Borrower Monthly Debts</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formData.coBorrowerMonthlyDebts}
                        onChange={(e) => updateField('coBorrowerMonthlyDebts', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                        placeholder="300"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto loans, credit cards, etc.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section B.1 - Borrower Profile */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Borrower Profile
              </h2>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Citizenship / Residency Status *</label>
                  <select
                    value={formData.citizenshipStatus}
                    onChange={(e) => updateField('citizenshipStatus', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="us-citizen">U.S. Citizen</option>
                    <option value="permanent-resident">Permanent Resident (Green Card)</option>
                    <option value="work-visa">Work Visa (H1-B, etc.)</option>
                    <option value="foreign-national">Foreign National</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.firstTimeHomebuyer}
                    onChange={(e) => updateField('firstTimeHomebuyer', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">First-time homebuyer</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.veteranEligible}
                    onChange={(e) => updateField('veteranEligible', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Veteran/VA eligible</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.currentlyOwnHome}
                    onChange={(e) => updateField('currentlyOwnHome', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Currently own a home</span>
                </label>
              </div>

              {/* Current Home Ownership Fields */}
              {formData.currentlyOwnHome && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Home Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">What will you do with your current home?</label>
                      <select
                        value={formData.currentHomeDisposition}
                        onChange={(e) => updateField('currentHomeDisposition', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      >
                        <option value="sell">Sell it</option>
                        <option value="rent">Rent it out</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Mortgage Balance</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formData.currentMortgageBalance}
                        onChange={(e) => updateField('currentMortgageBalance', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                        placeholder="250000"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank if no mortgage</p>
                    </div>
                    {formData.currentHomeDisposition === 'rent' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Monthly Mortgage Payment *</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={formData.currentMortgagePayment}
                          onChange={(e) => updateField('currentMortgagePayment', e.target.value)}
                          className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                          placeholder="2000"
                        />
                        <p className="text-xs text-gray-500 mt-1">Will count towards DTI</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section B.2 - Real Estate Owned (Investment Properties) */}
            {(formData.occupancy === 'investment' || formData.currentlyOwnHome) && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Real Estate Owned
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Investment Properties Owned</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.investmentPropertiesOwned}
                      onChange={(e) => updateField('investmentPropertiesOwned', e.target.value)}
                      className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Besides your current home</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Monthly Rental Income</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.rentalIncome}
                      onChange={(e) => updateField('rentalIncome', e.target.value)}
                      className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">From all rental properties</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Monthly Mortgage Payments on Rentals</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.rentalMortgages}
                      onChange={(e) => updateField('rentalMortgages', e.target.value)}
                      className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">All mortgage payments on rental properties</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section C - Debts */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Monthly Debts
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Monthly Debt Payments *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.monthlyDebts}
                    onChange={(e) => updateField('monthlyDebts', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto loans, student loans, credit cards, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Loan Payment (Monthly)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.studentLoanPayment}
                    onChange={(e) => updateField('studentLoanPayment', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="0"
                    disabled={!formData.studentLoansIncluded}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the qualifying payment if known</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Child Support / Alimony (Monthly)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.childSupportAlimony}
                    onChange={(e) => updateField('childSupportAlimony', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required monthly payments</p>
                </div>
              </div>
            </div>

            {/* Section D - Credit */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Credit Profile
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credit Score Range *</label>
                  <select
                    value={formData.creditScore}
                    onChange={(e) => updateField('creditScore', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="720+">720+ (Excellent)</option>
                    <option value="680-719">680-719 (Good)</option>
                    <option value="640-679">640-679 (Fair)</option>
                    <option value="600-639">600-639 (Poor)</option>
                    <option value="<600">Below 600</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bankruptcy}
                    onChange={(e) => updateField('bankruptcy', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Bankruptcy in last 2 years?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.latePayments}
                    onChange={(e) => updateField('latePayments', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Mortgage late payments in last 12 months?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.collections}
                    onChange={(e) => updateField('collections', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Outstanding collections, judgments, or tax liens?</span>
                </label>
              </div>
            </div>

            {/* Section D.1 - Loan Requests */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Loan Requests
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate Assumption (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.interestRate}
                    onChange={(e) => handleInterestRateChange(e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="6.5"
                    min="3"
                    max="10"
                    step="0.25"
                  />
                  {formData.interestRate !== '' && (parseFloat(formData.interestRate) < 3 || parseFloat(formData.interestRate) > 10) && (
                    <p className="text-xs text-red-600 mt-1">Interest rate must be between 3 and 10.</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Leave blank to use rate by credit tier</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term *</label>
                  <select
                    value={formData.loanTermYears}
                    onChange={(e) => updateField('loanTermYears', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="30">30-year</option>
                    <option value="15">15-year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Tax Rate (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.propertyTaxRate}
                    onChange={(e) => updateField('propertyTaxRate', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="1.2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Homeowners Insurance Rate (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.insuranceRate}
                    onChange={(e) => updateField('insuranceRate', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HOA / Condo Dues (Monthly)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.hoaMonthly}
                    onChange={(e) => updateField('hoaMonthly', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Section E - Cash/Assets */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cash & Assets
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.downPayment}
                      onChange={(e) => updateField('downPayment', e.target.value)}
                      className="flex-1 px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="20000"
                    />
                    <select
                      value={formData.downPaymentType}
                      onChange={(e) => updateField('downPaymentType', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="dollars">$</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment Source *</label>
                  <select
                    value={formData.downPaymentSource}
                    onChange={(e) => updateField('downPaymentSource', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="own">Own Funds</option>
                    <option value="gift">Gift</option>
                    <option value="combo">Mix of Own + Gift</option>
                  </select>
                </div>
              </div>

              {/* Gift Fund Details */}
              {(formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo') && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Gift Fund Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Relationship to Donor *</label>
                      <input
                        type="text"
                        value={formData.giftDonorRelationship}
                        onChange={(e) => updateField('giftDonorRelationship', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                        placeholder="Parent, Sibling, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gift Amount *</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formData.giftAmount}
                        onChange={(e) => updateField('giftAmount', e.target.value)}
                        className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                        placeholder="20000"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.giftLetterObtained}
                        onChange={(e) => updateField('giftLetterObtained', e.target.checked)}
                        className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Gift letter already obtained</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Cash After Down Payment</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.closingCosts}
                    onChange={(e) => updateField('closingCosts', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reserves (Months of PITI)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.reservesMonths}
                    onChange={(e) => updateField('reservesMonths', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.retirementFunds}
                    onChange={(e) => updateField('retirementFunds', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Retirement funds available for down payment?</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-4 md:py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-base md:text-base min-h-[48px]"
            >
              Calculate My PP Score
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Results Page
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-safe">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4 gap-3">
            <button
              onClick={() => setCurrentPage('input')}
              className="text-indigo-600 hover:text-indigo-700 active:text-indigo-800 font-medium flex items-center gap-2 min-h-[44px] text-base"
            >
              ← Back to Calculator
            </button>
            {user && (
              <button
                onClick={saveCalculation}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors text-sm min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Results'}
              </button>
            )}
          </div>
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              saveMessage.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' :
              saveMessage.includes('log in') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMessage}
            </div>
          )}

        {/* Top Summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 mb-6 text-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Your Purchasing Power Score</h1>
            <div
              className="text-5xl md:text-7xl font-bold mb-2 cursor-pointer hover:scale-105 active:scale-95 transition-transform inline-block"
              onClick={() => setShowScoreModal(true)}
              title="Click for detailed breakdown"
            >
              {results.ppScore}
            </div>
            <div className="text-lg md:text-xl opacity-90">out of 100 - {results.scoreInterpretation.level}</div>
            <p className="text-sm md:text-sm opacity-80 mt-2">{results.scoreInterpretation.description}</p>
            <button
              onClick={() => setShowScoreModal(true)}
              className="mt-4 px-6 py-3 md:py-2 bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto transition-colors min-h-[44px]"
            >
              <Info className="w-4 h-4" />
              How to Improve Your Score
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-6 md:mt-8">
            {results.scenarios.map((scenario, idx) => (
              <div key={idx} className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm opacity-90 mb-1">{scenario.name}</div>
                <div className="text-xl md:text-2xl font-bold">{formatCurrency(scenario.maxPrice)}</div>
                <div className="text-xs opacity-75 mt-1">Est. {formatCurrency(scenario.monthlyPayment)}/mo</div>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Profile Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Income Strength</span>
                  <span className="font-medium">{results.breakdown.income}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${results.breakdown.income}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Debt Load</span>
                  <span className="font-medium">{results.breakdown.debt}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${results.breakdown.debt}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Credit Score</span>
                  <span className="font-medium">{results.breakdown.credit}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${results.breakdown.credit}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Cash Available</span>
                  <span className="font-medium">{results.breakdown.cash}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${results.breakdown.cash}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Key Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Credit Tier</span>
                <span className="font-medium">{results.creditTier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Rate</span>
                <span className="font-medium">{results.estimatedRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Term</span>
                <span className="font-medium">{results.loanTermYears}-year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Property Tax Rate</span>
                <span className="font-medium">{results.propertyTaxRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Insurance Rate</span>
                <span className="font-medium">{results.insuranceRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">HOA Dues</span>
                <span className="font-medium">{formatCurrency(results.hoaMonthly)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Property Type</span>
                <span className="font-medium capitalize">{formData.propertyType.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">State</span>
                <span className="font-medium">{formData.state || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Occupancy</span>
                <span className="font-medium capitalize">{formData.occupancy}</span>
              </div>
            </div>
          </div>
        </div>

        {results.targetCheck && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 text-xl">Target Home Check</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Target Price</span>
                <span className="font-medium">{formatCurrency(results.targetCheck.targetPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Housing Payment</span>
                <span className="font-medium">{formatCurrency(results.targetCheck.targetHousingPayment)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DTI at Target</span>
                <span className={`font-medium ${results.targetCheck.targetDTI <= 0.43 ? 'text-green-600' : 'text-red-600'}`}>
                  {(results.targetCheck.targetDTI * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {results.targetCheck.targetDTI <= 0.43
                  ? 'Within a typical target DTI range.'
                  : 'Exceeds a typical target DTI range; consider a lower price or higher down payment.'}
              </div>
            </div>
          </div>
        )}

        {/* Loan Tracks - Enhanced Comparison */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2 text-xl">Recommended Loan Options</h3>
          <p className="text-sm text-gray-600 mb-6">Ranked by best fit for your situation</p>
          <div className="space-y-4">
            {results.loanTracks.map((track, idx) => {
              const isTopChoice = idx === 0 && track.status !== 'unlikely';
              const borderColor = track.status === 'likely' ? 'border-green-200 bg-green-50' :
                                 track.status === 'possible' ? 'border-yellow-200 bg-yellow-50' :
                                 'border-gray-200 bg-gray-50';

              return (
                <div key={idx} className={`rounded-xl border-2 ${borderColor} overflow-hidden transition-all`}>
                  {/* Header */}
                  <div className="p-4 md:p-5 bg-white">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        {track.status === 'likely' && <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />}
                        {track.status === 'possible' && <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />}
                        {track.status === 'unlikely' && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 text-lg">{track.name}</h4>
                            {track.badge && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                track.badge === 'Highly Recommended' ? 'bg-green-100 text-green-700' :
                                track.badge === 'Best Rates' ? 'bg-blue-100 text-blue-700' :
                                track.badge === 'Recommended' || track.badge === 'Best Option' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {track.badge}
                              </span>
                            )}
                            {isTopChoice && !track.badge && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                                #1 Match
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{track.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Min. Down Payment</div>
                        <div className="font-semibold text-gray-900">{(track.minDownPayment * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Est. Rate</div>
                        <div className="font-semibold text-gray-900">{track.estimatedRate.toFixed(3)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">PMI Required</div>
                        <div className="font-semibold text-gray-900">{track.pmiRequired ? 'Yes' : 'No'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Est. Monthly</div>
                        <div className="font-semibold text-gray-900">
                          {track.monthlyPaymentEst ? formatCurrency(track.monthlyPaymentEst) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {track.status !== 'unlikely' && (
                    <details className="group">
                      <summary className="cursor-pointer px-4 md:px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-indigo-600">View Details & Comparison</span>
                        <span className="text-indigo-600 group-open:rotate-180 transition-transform">▼</span>
                      </summary>

                      <div className="p-4 md:p-5 bg-white border-t border-gray-200 space-y-4">
                        {/* Best For */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                          <div className="text-xs font-semibold text-indigo-600 uppercase mb-1">Best For</div>
                          <div className="text-sm text-gray-800">{track.bestFor}</div>
                        </div>

                        {/* Pros and Cons */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Pros */}
                          <div>
                            <div className="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Advantages
                            </div>
                            <ul className="space-y-2">
                              {track.pros.map((pro, proIdx) => (
                                <li key={proIdx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Cons */}
                          <div>
                            <div className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Considerations
                            </div>
                            <ul className="space-y-2">
                              {track.cons.map((con, conIdx) => (
                                <li key={conIdx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {results.loanTracks.length > 1 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>Recommendation:</strong> {results.loanTracks[0].badge || 'Your top match is'} <strong>{results.loanTracks[0].name}</strong> based on your profile.
                  {results.loanTracks[0].monthlyPaymentEst && results.loanTracks[1]?.monthlyPaymentEst &&
                    ` This could save you approximately ${formatCurrency(Math.abs(results.loanTracks[1].monthlyPaymentEst - results.loanTracks[0].monthlyPaymentEst))}/month compared to ${results.loanTracks[1].name}.`
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Improvement Tips */}
        {results.improvements.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Top Ways to Improve Your Score
            </h3>
            <div className="space-y-3">
              {results.improvements.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50 border-2 border-indigo-100">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-indigo-600 uppercase">{rec.category}</span>
                      <span className="text-sm font-bold text-indigo-700">+{rec.potentialGain} points</span>
                    </div>
                    <div className="font-medium text-gray-800">{rec.action}</div>
                    <div className="text-sm text-gray-600 mt-1">{rec.issue}</div>
                  </div>
                </div>
              ))}
            </div>
            {results.improvements.length > 3 && (
              <button
                onClick={() => setShowScoreModal(true)}
                className="mt-4 text-indigo-600 hover:text-indigo-700 active:text-indigo-800 font-medium text-sm flex items-center gap-2 min-h-[44px]"
              >
                View all {results.improvements.length} recommendations
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">Ready for the Next Step?</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Connect with a mortgage broker who specializes in your loan profile</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <button className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors min-h-[48px]">
              Get Pre-Approved
            </button>
            <button className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 font-semibold py-3 px-8 rounded-lg transition-colors min-h-[48px]">
              Talk to a Broker
            </button>
          </div>
        </div>

        {/* Score Details Modal */}
        {showScoreModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 z-50 overflow-y-auto" onClick={() => setShowScoreModal(false)}>
            <div className="bg-white rounded-none md:rounded-2xl shadow-2xl max-w-4xl w-full min-h-screen md:min-h-0 md:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 md:p-6 rounded-t-none md:rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-2xl font-bold pr-2">Score Breakdown & Improvement Guide</h2>
                  <button onClick={() => setShowScoreModal(false)} className="hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 rounded-full p-2 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-3 md:gap-4">
                  <div className="text-4xl md:text-5xl font-bold">{results.ppScore}</div>
                  <div>
                    <div className="text-lg md:text-xl font-semibold">{results.scoreInterpretation.level}</div>
                    <div className="text-xs md:text-sm opacity-90">{results.scoreInterpretation.description}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6">
                {/* Score Component Breakdown */}
                <div className="mb-6 md:mb-8">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">How Your Score is Calculated</h3>
                  <div className="space-y-4">
                    <div className="border-2 border-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">Income Strength</span>
                        <span className="text-lg font-bold text-green-600">{results.breakdown.income}%</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">Worth up to 30 points</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-green-500 h-3 rounded-full" style={{ width: `${results.breakdown.income}%` }}></div>
                      </div>
                    </div>

                    <div className="border-2 border-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">Debt Management</span>
                        <span className="text-lg font-bold text-blue-600">{results.breakdown.debt}%</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">Worth up to 25 points (lower debt = higher score)</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${results.breakdown.debt}%` }}></div>
                      </div>
                    </div>

                    <div className="border-2 border-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">Credit Score</span>
                        <span className="text-lg font-bold text-purple-600">{results.breakdown.credit}%</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">Worth up to 25 points - {results.creditTier} tier</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${results.breakdown.credit}%` }}></div>
                      </div>
                    </div>

                    <div className="border-2 border-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">Down Payment / Cash</span>
                        <span className="text-lg font-bold text-indigo-600">{results.breakdown.cash}%</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">Worth up to 20 points</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${results.breakdown.cash}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What Your Score Qualifies For */}
                <div className="mb-6 md:mb-8">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Loan Qualification at Your Score Level</h3>
                  <div className="space-y-3">
                    {results.loanQualifications.map((qual, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <div>
                          <div className="font-semibold text-gray-800">{qual.loan}</div>
                          <div className="text-sm text-gray-600">{qual.status}</div>
                        </div>
                        <div className="text-sm font-medium text-indigo-600">{qual.rates}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Improvement Recommendations */}
                {results.improvements.length > 0 && (
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Personalized Improvement Plan</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Based on your current profile, here are specific actions you can take to improve your score:
                    </p>
                    <div className="space-y-3">
                      {results.improvements.map((rec, idx) => {
                        const priorityColors = {
                          high: 'border-red-200 bg-red-50',
                          medium: 'border-yellow-200 bg-yellow-50',
                          low: 'border-blue-200 bg-blue-50'
                        };
                        const priorityBadges = {
                          high: 'bg-red-100 text-red-700',
                          medium: 'bg-yellow-100 text-yellow-700',
                          low: 'bg-blue-100 text-blue-700'
                        };
                        return (
                          <div key={idx} className={`border-2 rounded-lg p-4 ${priorityColors[rec.priority]}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-600 uppercase">{rec.category}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityBadges[rec.priority]}`}>
                                  {rec.priority} priority
                                </span>
                              </div>
                              <span className="text-lg font-bold text-green-600">+{rec.potentialGain} pts</span>
                            </div>
                            <div className="font-semibold text-gray-800 mb-1">{rec.action}</div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Current issue:</span> {rec.issue}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                      <div className="font-semibold text-indigo-900 mb-2">Potential Score Range</div>
                      <div className="text-sm text-indigo-700">
                        If you implement the high priority improvements, your score could reach:{' '}
                        <span className="font-bold text-lg">
                          {Math.min(100, results.ppScore + results.improvements.filter(r => r.priority === 'high').reduce((sum, r) => sum + r.potentialGain, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 p-4 md:p-6 rounded-b-none md:rounded-b-2xl border-t z-10">
                <button
                  onClick={() => setShowScoreModal(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors min-h-[48px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default MortgagePowerApp;
