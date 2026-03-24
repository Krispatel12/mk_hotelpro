document.addEventListener('DOMContentLoaded', function () {
    const statusSelects = document.querySelectorAll('select[name="status"], select[name="payment_status"]');
    statusSelects.forEach(select => {
        select.addEventListener('change', function () {
            this.form.submit();
        });
    });
});
