document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('hirePurchaseForm');
    const summarySection = document.getElementById('summarySection');
    const paymentScheduleContainer = document.getElementById('paymentScheduleContainer');
    const emptyScheduleState = document.getElementById('emptyScheduleState');
    const emptyPlansState = document.getElementById('emptyPlansState');
    const savedPlansContainer = document.getElementById('savedPlansContainer');
    const savePlanBtn = document.getElementById('savePlanBtn');
    const resetBtn = document.getElementById('resetBtn');
    const scheduleItemCount = document.getElementById('scheduleItemCount');
    const planCount = document.getElementById('planCount');
    
    let currentCalculation = null;
    let savedPlans = JSON.parse(localStorage.getItem('quickEMIPlans')) || [];
    
    // Load saved plans on page load
    updateSavedPlansList();
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculatePaymentSchedule();
    });
    
    savePlanBtn.addEventListener('click', function() {
        if (currentCalculation) {
            saveCurrentPlan();
        }
    });
    
    resetBtn.addEventListener('click', function() {
        form.reset();
        summarySection.style.display = 'none';
        paymentScheduleContainer.style.display = 'none';
        emptyScheduleState.style.display = 'block';
        currentCalculation = null;
    });
    
    function calculatePaymentSchedule() {
        const itemName = document.getElementById('itemName').value;
        const itemPrice = parseFloat(document.getElementById('itemPrice').value);
        const downPayment = parseFloat(document.getElementById('downPayment').value);
        const interestRate = parseFloat(document.getElementById('interestRate').value) / 100;
        const paymentPeriod = parseInt(document.getElementById('paymentPeriod').value);
        
        // Calculate financed amount
        const financedAmount = itemPrice - downPayment;
        
        // Calculate monthly interest rate
        const monthlyInterestRate = interestRate / 12;
        
        // Calculate monthly payment using the formula for installment loans
        let monthlyPayment;
        if (monthlyInterestRate === 0) {
            monthlyPayment = financedAmount / paymentPeriod;
        } else {
            monthlyPayment = financedAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, paymentPeriod)) / 
                             (Math.pow(1 + monthlyInterestRate, paymentPeriod) - 1);
        }
        
        // Generate payment schedule
        const paymentSchedule = [];
        let balance = financedAmount;
        const startDate = new Date();
        
        for (let i = 1; i <= paymentPeriod; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(startDate.getMonth() + i);
            
            const interestPayment = balance * monthlyInterestRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;
            
            // Handle potential rounding errors for the last payment
            let finalPayment = monthlyPayment;
            let finalPrincipal = principalPayment;
            let finalInterest = interestPayment;
            let finalBalance = balance;
            
            if (i === paymentPeriod) {
                // Adjust the last payment to account for rounding errors
                finalPayment = balance + principalPayment;
                finalPrincipal = balance;
                finalBalance = 0;
            }
            
            paymentSchedule.push({
                paymentNumber: i,
                paymentDate: paymentDate.toLocaleDateString(),
                paymentAmount: finalPayment,
                principal: finalPrincipal,
                interest: finalInterest,
                balance: Math.abs(finalBalance) < 0.01 ? 0 : finalBalance
            });
        }
        
        // Calculate total payment and total interest
        const totalPayment = downPayment + (monthlyPayment * paymentPeriod);
        const totalInterest = totalPayment - itemPrice;
        
        // Store current calculation
        currentCalculation = {
            itemName,
            itemPrice,
            downPayment,
            financedAmount,
            interestRate: interestRate * 100,
            paymentPeriod,
            monthlyPayment,
            totalPayment,
            totalInterest,
            paymentSchedule
        };
        
        // Update UI
        updateSummary();
        updatePaymentSchedule();
    }
    
    function updateSummary() {
        if (!currentCalculation) return;
        
        document.getElementById('summaryItemName').textContent = currentCalculation.itemName;
        document.getElementById('summaryItemPrice').textContent = `₹${formatINR(currentCalculation.itemPrice)}`;
        document.getElementById('summaryDownPayment').textContent = `₹${formatINR(currentCalculation.downPayment)}`;
        document.getElementById('summaryFinancedAmount').textContent = `₹${formatINR(currentCalculation.financedAmount)}`;
        document.getElementById('summaryInterestRate').textContent = `${currentCalculation.interestRate.toFixed(2)}%`;
        document.getElementById('summaryPaymentPeriod').textContent = `${currentCalculation.paymentPeriod} months`;
        document.getElementById('summaryMonthlyPayment').textContent = `₹${formatINR(currentCalculation.monthlyPayment)}`;
        document.getElementById('summaryTotalPayment').textContent = `₹${formatINR(currentCalculation.totalPayment)}`;
        document.getElementById('summaryTotalInterest').textContent = `₹${formatINR(currentCalculation.totalInterest)}`;
        
        summarySection.style.display = 'block';
    }
    
    function updatePaymentSchedule() {
        if (!currentCalculation) return;
        
        const paymentScheduleBody = document.getElementById('paymentScheduleBody');
        paymentScheduleBody.innerHTML = '';
        
        currentCalculation.paymentSchedule.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.paymentNumber}</td>
                <td>${payment.paymentDate}</td>
                <td>₹${formatINR(payment.paymentAmount)}</td>
                <td>₹${formatINR(payment.principal)}</td>
                <td>₹${formatINR(payment.interest)}</td>
                <td>₹${formatINR(payment.balance)}</td>
            `;
            paymentScheduleBody.appendChild(row);
        });
        
        scheduleItemCount.textContent = `${currentCalculation.paymentSchedule.length} items`;
        paymentScheduleContainer.style.display = 'block';
        emptyScheduleState.style.display = 'none';
    }
    
    function saveCurrentPlan() {
        if (!currentCalculation) return;
        
        const plan = {
            ...currentCalculation,
            id: Date.now(),
            dateSaved: new Date().toLocaleDateString()
        };
        
        savedPlans.push(plan);
        localStorage.setItem('quickEMIPlans', JSON.stringify(savedPlans));
        
        updateSavedPlansList();
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '1050';
        toast.innerHTML = `
            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">Success</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    Plan saved successfully!
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    function updateSavedPlansList() {
        savedPlansContainer.innerHTML = '';
        
        if (savedPlans.length === 0) {
            emptyPlansState.style.display = 'block';
            planCount.textContent = '0 plans';
            return;
        }
        
        emptyPlansState.style.display = 'none';
        planCount.textContent = `${savedPlans.length} plan${savedPlans.length !== 1 ? 's' : ''}`;
        
        savedPlans.forEach(plan => {
            const planElement = document.createElement('div');
            planElement.className = 'plan-item';
            planElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>${plan.itemName}</h5>
                        <p><strong>Price:</strong> ₹${formatINR(plan.itemPrice)} | <strong>Down Payment:</strong> ₹${formatINR(plan.downPayment)}</p>
                        <p><strong>Monthly:</strong> ₹${formatINR(plan.monthlyPayment)} | <strong>Term:</strong> ${plan.paymentPeriod} months</p>
                        <p><small class="text-muted">Saved on ${plan.dateSaved}</small></p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-danger delete-plan" data-id="${plan.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            savedPlansContainer.appendChild(planElement);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-plan').forEach(button => {
            button.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                deletePlan(id);
            });
        });
    }
    
    function deletePlan(id) {
        savedPlans = savedPlans.filter(plan => plan.id !== id);
        localStorage.setItem('quickEMIPlans', JSON.stringify(savedPlans));
        updateSavedPlansList();
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '1050';
        toast.innerHTML = `
            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">Deleted</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    Plan deleted successfully!
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    function formatINR(amount) {
        // Format number with Indian comma separators
        const amountStr = amount.toFixed(2);
        let [integerPart, decimalPart] = amountStr.split('.');
        
        // Add commas for Indian numbering system
        let lastThreeDigits = integerPart.slice(-3);
        let otherDigits = integerPart.slice(0, -3);
        
        if (otherDigits !== '') {
            // Add commas every 2 digits from right to left
            otherDigits = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
            integerPart = otherDigits + ',' + lastThreeDigits;
        } else {
            integerPart = lastThreeDigits;
        }
        
        return `${integerPart}.${decimalPart}`;
    }
});
