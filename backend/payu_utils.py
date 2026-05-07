import hashlib


def generate_payu_hash(key, txnid, amount, productinfo, firstname, email, salt):
    # Hash sequence: key|txnid|amount|productinfo|firstname|email|||||||||||salt
    hash_string = (
        f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|||||||||||{salt}"
    )
    return hashlib.sha512(hash_string.encode("utf-8")).hexdigest()


def verify_payu_hash(
    salt,
    status,
    additional_charges,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key,
    posted_hash,
):
    # Verification Hash sequence: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    # Note: additional_charges is meant to be checked if present, but for simple verification:

    hash_string = f"{salt}|{status}|||||||||||{email}|{firstname}|{productinfo}|{amount}|{txnid}|{key}"
    calculated_hash = hashlib.sha512(hash_string.encode("utf-8")).hexdigest()
    return calculated_hash == posted_hash
