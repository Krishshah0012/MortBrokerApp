import React, { useEffect, useState } from 'react';
import { Home, DollarSign, TrendingUp, FileText, ArrowRight, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const MortgagePowerApp = () => {
  const [currentPage, setCurrentPage] = useState('input');
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
    monthlyDebts: '',
    studentLoansIncluded: false,
    studentLoanPayment: '',
    creditScore: '720+',
    bankruptcy: false,
    latePayments: false,
    downPayment: '',
    downPaymentType: 'dollars',
    downPaymentSource: 'own',
    closingCosts: '',
    reservesMonths: '',
    retirementFunds: false,
    firstTimeHomebuyer: false,
    veteranEligible: false,
    coBorrower: false,
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

  const calculateResults = () => {
    const annualIncome = parseFloat(formData.annualIncome) || 0;
    const otherIncome = parseFloat(formData.otherMonthlyIncome) || 0;
    const monthlyDebts = parseFloat(formData.monthlyDebts) || 0;
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
    const grossMonthlyIncome = ((annualIncome * incomeMultiplier) / 12) + (otherIncome * incomeMultiplier);
    const totalMonthlyDebts = monthlyDebts + studentLoanPayment;
    
    // Credit tier mapping
    const creditTiers = {
      '720+': { rate: 6.5, score: 95, tier: 'Excellent' },
      '680-719': { rate: 7.0, score: 80, tier: 'Good' },
      '640-679': { rate: 7.5, score: 65, tier: 'Fair' },
      '600-639': { rate: 8.0, score: 50, tier: 'Poor' },
      '<600': { rate: 9.0, score: 35, tier: 'Very Poor' }
    };
    
    const creditInfo = creditTiers[formData.creditScore];
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
    if (formData.incomeNeedsAveraging) ppScore -= 5;
    const employmentYears = parseFloat(formData.employmentYears) || 0;
    if (employmentYears > 0 && employmentYears < 2) ppScore -= 5;
    if (employmentYears >= 5) ppScore += 3;
    if ((formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo') && downPaymentPct < 0.1) ppScore -= 3;
    const reservesMonths = parseFloat(formData.reservesMonths) || 0;
    if (reservesMonths >= 6) ppScore += 5;
    if (reservesMonths > 0 && reservesMonths < 2) ppScore -= 5;
    if (formData.firstTimeHomebuyer && downPaymentPct < 0.05) ppScore -= 5;
    if (formData.veteranEligible) ppScore += 3;
    if (formData.coBorrower) ppScore += 3;
    
    ppScore = Math.max(0, Math.min(100, Math.round(ppScore)));
    
    // Determine loan tracks
    const loanTracks = [];
    
    // Conventional
    if (formData.creditScore === '720+' || formData.creditScore === '680-719') {
      if (dtiRatio < 0.45 && !formData.bankruptcy) {
        loanTracks.push({
          name: 'Conventional',
          status: (formData.downPaymentSource === 'gift' || formData.downPaymentSource === 'combo') && downPaymentPct < 0.1 ? 'possible' : 'likely',
          reason: 'Strong credit and healthy DTI ratio'
        });
      }
    }
    
    // FHA
    if (parseInt(formData.creditScore.split('-')[0] || formData.creditScore.replace('+', '').replace('<', '')) >= 580 || formData.creditScore === '600-639') {
      if (downPaymentPct >= 0.035 || downPaymentDollarsForScore >= 10000) {
        loanTracks.push({
          name: 'FHA',
          status: 'likely',
          reason: 'Meets minimum down payment and credit requirements'
        });
      } else if (formData.firstTimeHomebuyer) {
        loanTracks.push({
          name: 'FHA',
          status: 'possible',
          reason: 'First-time buyers often qualify with low down payment options'
        });
      }
    }
    
    // Jumbo
    const conformingLimitByState = {
      AK: 1149825,
      HI: 1149825
    };
    const conformingLimit = conformingLimitByState[formData.state] || 766550; // 2024 standard limit
    if (scenarios[1].maxLoan > conformingLimit) {
      if (formData.creditScore === '720+' && downPaymentPct >= 0.20) {
        loanTracks.push({
          name: 'Jumbo',
          status: 'possible',
          reason: 'Loan amount exceeds conforming limits, requires strong profile'
        });
      } else {
        loanTracks.push({
          name: 'Jumbo',
          status: 'unlikely',
          reason: 'Need higher credit score and larger down payment'
        });
      }
    }
    
    // VA (only show if primary residence)
    if (formData.occupancy === 'primary' && formData.veteranEligible) {
      loanTracks.push({
        name: 'VA',
        status: formData.bankruptcy ? 'possible' : 'likely',
        reason: 'VA eligibility supports lower down payment requirements'
      });
    }
    
    // Non-QM
    if (formData.employmentType === 'self-employed' || formData.bankruptcy || dtiRatio > 0.45) {
      loanTracks.push({
        name: 'Non-QM',
        status: 'possible',
        reason: 'Alternative documentation may help if conventional doesn\'t work'
      });
    }

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
    
    return {
      ppScore,
      scenarios,
      loanTracks,
      breakdown: {
        income: Math.round(incomeScore / 30 * 100),
        debt: Math.round(debtScore / 25 * 100),
        credit: creditInfo.score,
        cash: Math.round(cashScore / 20 * 100)
      },
      creditTier: creditInfo.tier,
      estimatedRate: assumedRate,
      loanTermYears,
      propertyTaxRate: propertyTaxRate * 100,
      insuranceRate: insuranceRate * 100,
      hoaMonthly: hoaEstimate,
      targetCheck
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

  if (currentPage === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Home className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Get Your Purchasing Power Score</h1>
            </div>
            <p className="text-gray-600 mb-8">Complete this quick assessment in under 3 minutes to discover your home buying potential.</p>

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
                    value={formData.zipCode}
                    onChange={(e) => handleZipChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="single-family">Single-Family</option>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      value={formData.targetPurchasePrice}
                      onChange={(e) => updateField('targetPurchasePrice', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="450000"
                    />
                  </div>
                )}
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
                    value={formData.annualIncome}
                    onChange={(e) => updateField('annualIncome', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="75000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Monthly Income</label>
                  <input
                    type="number"
                    value={formData.otherMonthlyIncome}
                    onChange={(e) => updateField('otherMonthlyIncome', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bonus, commission, side income</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years in the Field *</label>
                  <input
                    type="number"
                    value={formData.yearsInField}
                    onChange={(e) => updateField('yearsInField', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="w2">W-2 Employee</option>
                    <option value="self-employed">Self-Employed</option>
                  </select>
                </div>
                {formData.employmentType === 'self-employed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Years Self-Employed *</label>
                    <select
                      value={formData.selfEmployedYears}
                      onChange={(e) => updateField('selfEmployedYears', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    value={formData.employmentYears}
                    onChange={(e) => updateField('employmentYears', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.coBorrower}
                    onChange={(e) => updateField('coBorrower', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Co-borrower on the loan</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.employmentGaps}
                    onChange={(e) => updateField('employmentGaps', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Employment gaps in the last 2 years</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.incomeNeedsAveraging}
                    onChange={(e) => updateField('incomeNeedsAveraging', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Income requires 2-year averaging (bonus/commission/OT)</span>
                </label>
              </div>
            </div>

            {/* Section B.1 - Borrower Profile */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Borrower Profile
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.firstTimeHomebuyer}
                    onChange={(e) => updateField('firstTimeHomebuyer', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">First-time homebuyer</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.veteranEligible}
                    onChange={(e) => updateField('veteranEligible', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Veteran/VA eligible</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.coBorrower}
                    onChange={(e) => updateField('coBorrower', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Co-borrower on the loan</span>
                </label>
              </div>
            </div>

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
                    value={formData.monthlyDebts}
                    onChange={(e) => updateField('monthlyDebts', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto loans, student loans, credit cards, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Loan Payment (Monthly)</label>
                  <input
                    type="number"
                    value={formData.studentLoanPayment}
                    onChange={(e) => updateField('studentLoanPayment', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                    disabled={!formData.studentLoansIncluded}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the qualifying payment if known</p>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Bankruptcy in last 4 years?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.latePayments}
                    onChange={(e) => updateField('latePayments', e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Late payments in last 12 months?</span>
                </label>
              </div>
            </div>

            {/* Section D.1 - Loan Assumptions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Loan Assumptions
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate Assumption (%)</label>
                  <input
                    type="number"
                    value={formData.interestRate}
                    onChange={(e) => handleInterestRateChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="30">30-year</option>
                    <option value="15">15-year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Tax Rate (%)</label>
                  <input
                    type="number"
                    value={formData.propertyTaxRate}
                    onChange={(e) => updateField('propertyTaxRate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="1.2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Homeowners Insurance Rate (%)</label>
                  <input
                    type="number"
                    value={formData.insuranceRate}
                    onChange={(e) => updateField('insuranceRate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HOA / Condo Dues (Monthly)</label>
                  <input
                    type="number"
                    value={formData.hoaMonthly}
                    onChange={(e) => updateField('hoaMonthly', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      value={formData.downPayment}
                      onChange={(e) => updateField('downPayment', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="own">Own Funds</option>
                    <option value="gift">Gift</option>
                    <option value="combo">Mix of Own + Gift</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Cash After Down Payment</label>
                  <input
                    type="number"
                    value={formData.closingCosts}
                    onChange={(e) => updateField('closingCosts', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reserves (Months of PITI)</label>
                  <input
                    type="number"
                    value={formData.reservesMonths}
                    onChange={(e) => updateField('reservesMonths', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Retirement funds available for down payment?</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              Calculate My PP Score
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setCurrentPage('input')}
          className="mb-4 text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
        >
          ← Back to Calculator
        </button>

        {/* Top Summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-6 text-white">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-2">Your Purchasing Power Score</h1>
            <div className="text-7xl font-bold mb-2">{results.ppScore}</div>
            <div className="text-xl opacity-90">out of 100</div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {results.scenarios.map((scenario, idx) => (
              <div key={idx} className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm opacity-90 mb-1">{scenario.name}</div>
                <div className="text-2xl font-bold">{formatCurrency(scenario.maxPrice)}</div>
                <div className="text-xs opacity-75 mt-1">Est. {formatCurrency(scenario.monthlyPayment)}/mo</div>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
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

          <div className="bg-white rounded-xl shadow-lg p-6">
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
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
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

        {/* Loan Tracks */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-xl">Best-Fit Loan Tracks</h3>
          <div className="space-y-3">
            {results.loanTracks.map((track, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-100">
                {track.status === 'likely' && <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />}
                {track.status === 'possible' && <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />}
                {track.status === 'unlikely' && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{track.name}</div>
                  <div className="text-sm text-gray-600">{track.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready for the Next Step?</h3>
          <p className="text-gray-600 mb-6">Connect with a mortgage broker who specializes in your loan profile</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
              Get Pre-Approved
            </button>
            <button className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-3 px-8 rounded-lg transition-colors">
              Talk to a Broker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgagePowerApp;
